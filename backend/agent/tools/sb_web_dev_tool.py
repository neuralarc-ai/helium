import json
import asyncio
from typing import Optional, List, Dict, Any
from pathlib import Path
import time
from uuid import uuid4

from agentpress.tool import ToolResult, openapi_schema, usage_example
from agentpress.thread_manager import ThreadManager
from sandbox.tool_base import SandboxToolsBase
from utils.logger import logger


class SandboxWebDevTool(SandboxToolsBase):
    WORKSPACE_PATH = "/workspace"
    TEMPLATE_DIR = "/opt/templates/next14-shadcn"
    DEFAULT_TIMEOUT = 60
    BUILD_TIMEOUT = 1800
    INSTALL_TIMEOUT = 900
    DEFAULT_PORT = 3000
    
    SHADCN_CONFIG_TEMPLATE = {
        "$schema": "https://ui.shadcn.com/schema.json",
        "style": "new-york",
        "rsc": True,
        "tsx": True,
        "tailwind": {
            "config": "",
            "css": "src/app/globals.css",
            "baseColor": "neutral",
            "cssVariables": True,
            "prefix": ""
        },
        "aliases": {
            "components": "@/components",
            "utils": "@/lib/utils",
            "ui": "@/components/ui",
            "lib": "@/lib",
            "hooks": "@/hooks"
        },
        "iconLibrary": "lucide"
    }

    def __init__(self, project_id: str, thread_id: str, thread_manager: ThreadManager):
        super().__init__(project_id, thread_manager)
        self.thread_id = thread_id
        self._sessions: Dict[str, str] = {}
        self.workspace_path = self.WORKSPACE_PATH

    async def _ensure_session(self, session_name: str = "default") -> str:
        if session_name not in self._sessions:
            session_id = str(uuid4())
            try:
                await self._ensure_sandbox()
                await self.sandbox.process.create_session(session_id)
                self._sessions[session_name] = session_id
            except Exception as e:
                raise RuntimeError(f"Failed to create session: {str(e)}")
        return self._sessions[session_name]

    async def _execute_command(self, command: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
        session_id = await self._ensure_session("web_dev_commands")
        from daytona_sdk import SessionExecuteRequest
        
        req = SessionExecuteRequest(
            command=command,
            var_async=False,
            cwd=self.workspace_path
        )
        
        response = await self.sandbox.process.execute_session_command(
            session_id=session_id,
            req=req,
            timeout=timeout
        )
        
        logs = await self.sandbox.process.get_session_command_logs(
            session_id=session_id,
            command_id=response.cmd_id
        )
        
        return {
            "output": logs,
            "exit_code": response.exit_code
        }

    async def _exec_sh(self, command: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
        await self._ensure_sandbox()
        resp = await self.sandbox.process.exec(f"/bin/sh -c \"{command}\"", timeout=timeout)
        output = getattr(resp, "result", None) or getattr(resp, "output", "") or ""
        return {"exit_code": getattr(resp, "exit_code", 1), "output": output}

    async def _run_in_tmux_background(self, session: str, command: str) -> None:
        await self._ensure_sandbox()
        await self._exec_sh(f"tmux has-session -t {session} 2>/dev/null || tmux new-session -d -s {session}")
        escaped = command.replace('"', '\\"')
        await self._exec_sh(f"tmux send-keys -t {session} \"cd {self.workspace_path} && {escaped}\" C-m")

    def _get_project_path(self, project_name: str) -> str:
        return f"{self.workspace_path}/{project_name}"

    async def _project_exists(self, project_name: str) -> bool:
        check_result = await self._exec_sh(f"test -f {self._get_project_path(project_name)}/package.json && echo OK || echo MISS")
        return "OK" in check_result.get("output", "")

    async def _has_src_directory(self, project_path: str) -> bool:
        src_check = await self._exec_sh(f"test -d {project_path}/src && echo YES || echo NO")
        return "YES" in src_check.get("output", "")

    def _get_package_manager_command(self, package_manager: str, command_type: str, additional_args: str = "") -> str:
        commands = {
            "pnpm": {
                "install": f"pnpm install --prefer-offline {additional_args}",
                "add": f"pnpm add {additional_args}",
                "add_dev": f"pnpm add -D {additional_args}",
                "build": "pnpm run build",
                "dev": "pnpm run dev",
                "start": "pnpm run start"
            },
            "npm": {
                "install": f"npm install --no-audit --no-fund --progress=false {additional_args}",
                "add": f"npm install --save {additional_args}",
                "add_dev": f"npm install --save-dev {additional_args}",
                "build": "npm run build",
                "dev": "npm run dev",
                "start": "npm run start"
            }
        }
        return commands.get(package_manager, commands["npm"]).get(command_type, "")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "list_web_projects",
            "description": "List all web projects in the workspace directory. Shows Node.js/React/Next.js projects with their types.",
            "parameters": {"type": "object", "properties": {}, "required": []}
        }
    })
    @usage_example('''
        <!-- List all web projects in the workspace -->
        <function_calls>
        <invoke name="list_web_projects">
        </invoke>
        </function_calls>
        ''')
    async def list_web_projects(self) -> ToolResult:
        try:
            await self._ensure_sandbox()
            
            list_cmd = f"ls -la {self.workspace_path} | grep ^d | awk '{{print $NF}}' | grep -v '^\\.$' | grep -v '^\\.\\.\\$'"
            result = await self._execute_command(list_cmd)
            output = result.get("output", "")
            
            if result.get("exit_code") != 0 or not output:
                list_cmd = f"ls -d {self.workspace_path}/*/ 2>/dev/null | xargs -n1 basename 2>/dev/null || echo 'No projects found'"
                result = await self._execute_command(list_cmd)
                output = result.get("output", "")
            
            projects = output.strip().split('\n') if output else []
            projects = [p for p in projects if p and p != 'No projects found']
            
            if not projects:
                return self.success_response("""
📁 No projects found in workspace.

To create a new project, use create_web_project or execute_command:
- Next.js: npx create-next-app@latest my-next-app --ts --eslint --tailwind --app --src-dir --import-alias "@/*" --use-npm
- React: npx create-react-app my-app --template typescript
- Vite: npm create vite@latest my-app -- --template react-ts
""")

            project_info = []
            for project in projects:
                project_path = self._get_project_path(project)
                package_check = f"test -f {project_path}/package.json && echo '__HAS_PACKAGE__' || echo '__NO_PACKAGE__'"
                package_result = await self._execute_command(package_check)
                
                if "__HAS_PACKAGE__" in package_result.get("output", ""):
                    cat_cmd = f"cat {project_path}/package.json 2>/dev/null | grep -E '\"(next|react|vite)\"' | head -1"
                    cat_result = await self._execute_command(cat_cmd)
                    
                    project_type = "Node.js project"
                    output_lower = cat_result.get("output", "").lower()
                    if "next" in output_lower:
                        project_type = "Next.js project"
                    elif "react" in output_lower:
                        project_type = "React project"
                    elif "vite" in output_lower:
                        project_type = "Vite project"
                    
                    project_info.append(f"  📦 {project} ({project_type})")
                else:
                    project_info.append(f"  📁 {project} (Directory)")

            return self.success_response(f"""
📁 Projects found in workspace:

{chr(10).join(project_info)}

Total: {len(projects)} project(s)

Use 'get_project_structure' to view project files.
To run a project, use start_server or execute_command with: cd project-name && npm run dev
""")

        except Exception as e:
            logger.error(f"Error listing projects: {str(e)}", exc_info=True)
            return self.fail_response(f"Error listing projects: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "get_project_structure",
            "description": "Get the file structure of a web project, showing important files and directories.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_name": {"type": "string", "description": "Name of the project directory to examine"},
                    "max_depth": {"type": "integer", "description": "Maximum depth to traverse (default: 3)", "default": 3}
                },
                "required": ["project_name"]
            }
        }
    })
    @usage_example('''
        <!-- Get structure of a project -->
        <function_calls>
        <invoke name="get_project_structure">
        <parameter name="project_name">my-app</parameter>
        </invoke>
        </function_calls>
        ''')
    async def get_project_structure(self, project_name: str, max_depth: int = 3) -> ToolResult:
        try:
            await self._ensure_sandbox()
            project_path = self._get_project_path(project_name)
            
            check_cmd = f"test -d {project_path} && echo '__DIR_EXISTS__' || echo '__DIR_MISSING__'"
            check_result = await self._execute_command(check_cmd)
            
            if "__DIR_MISSING__" in check_result.get("output", ""):
                return self.fail_response(f"Project '{project_name}' not found.")

            tree_cmd = (
                f"cd {project_path} && find . -maxdepth {max_depth} -type f -o -type d | "
                "grep -v node_modules | grep -v '\\.next' | grep -v '\\.git' | grep -v 'dist' | sort"
            )
            tree_result = await self._execute_command(tree_cmd)
            
            if tree_result.get("exit_code") != 0:
                return self.fail_response(f"Failed to get project structure: {tree_result.get('output')}")

            structure = tree_result.get("output", "")

            package_info = ""
            package_cmd = f"test -f {project_path}/package.json && cat {project_path}/package.json | grep -E '\"(name|version|scripts)\"' -A 5 | head -20"
            package_result = await self._execute_command(package_cmd)
            
            if package_result.get("exit_code") == 0:
                package_info = f"\n\n📋 Package.json info:\n{package_result.get('output', '')}"

            return self.success_response(f"""
📁 Project structure for '{project_name}':

{structure}
{package_info}

To run this project:
1. Use install_dependencies if needed
2. Use start_server (mode='dev' or 'prod')
3. Use expose_port to make it publicly accessible (start_server returns the preview URL)
""")

        except Exception as e:
            logger.error(f"Error getting project structure: {str(e)}", exc_info=True)
            return self.fail_response(f"Error getting project structure: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "create_web_project",
            "description": "Scaffold a new web project with optional shadcn/ui auto-initialization. Supports Next.js (default). Uses cached templates when available for speed.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_name": {"type": "string", "description": "Project directory name to create"},
                    "template": {"type": "string", "description": "Template key (e.g., 'next14-shadcn' or 'next')", "default": "next14-shadcn"},
                    "package_manager": {"type": "string", "description": "Package manager: pnpm|npm", "default": "pnpm"},
                    "init_shadcn": {"type": "boolean", "description": "Automatically initialize shadcn/ui (default: true for Next.js projects)", "default": True}
                },
                "required": ["project_name"]
            }
        }
    })
    @usage_example('''
        <!-- Create a new Next.js project with automatic shadcn/ui initialization -->
        <function_calls>
        <invoke name="create_web_project">
        <parameter name="project_name">my-portfolio</parameter>
        <parameter name="template">next14-shadcn</parameter>
        <parameter name="package_manager">pnpm</parameter>
        <parameter name="init_shadcn">true</parameter>
        </invoke>
        </function_calls>
        
        <!-- Create a plain Next.js project without shadcn/ui -->
        <function_calls>
        <invoke name="create_web_project">
        <parameter name="project_name">simple-app</parameter>
        <parameter name="template">next</parameter>
        <parameter name="init_shadcn">false</parameter>
        </invoke>
        </function_calls>
        ''')
    async def create_web_project(self, project_name: str, template: str = "next14-shadcn", package_manager: str = "pnpm", init_shadcn: bool = True) -> ToolResult:
        try:
            await self._ensure_sandbox()
            
            use_template = template.lower() in ["next14-shadcn", "next"]
            exists_check = await self._exec_sh(f"test -d {self.TEMPLATE_DIR} && echo __TEMPLATE__ || echo __NO_TEMPLATE__")
            has_template = "__TEMPLATE__" in exists_check.get("output", "")

            proj_dir = self._get_project_path(project_name)
            already = await self._exec_sh(f"test -e {proj_dir} && echo __EXISTS__ || echo __NEW__")
            if "__EXISTS__" in already.get("output", ""):
                return self.fail_response(f"Path '{project_name}' already exists")

            if use_template and has_template:
                copy = await self._exec_sh(f"cp -R {self.TEMPLATE_DIR} {proj_dir}")
                if copy["exit_code"] != 0:
                    return self.fail_response(f"Failed to copy template: {copy['output']}")
            else:
                if package_manager == "pnpm":
                    scaffold_cmd = (
                        f"cd {self.workspace_path} && "
                        f"pnpm dlx create-next-app@14 {project_name} --ts --eslint --tailwind --app --src-dir --import-alias '@/*' --use-pnpm"
                    )
                else:
                    scaffold_cmd = (
                        f"cd {self.workspace_path} && "
                        f"npx create-next-app@14 {project_name} --ts --eslint --tailwind --app --src-dir --import-alias '@/*' --use-npm"
                    )
                
                res = await self._exec_sh(scaffold_cmd, timeout=self.INSTALL_TIMEOUT)
                if res["exit_code"] != 0:
                    return self.fail_response(f"Scaffold failed: {res['output']}")

            install_cmd = self._get_package_manager_command(package_manager, "install")
            install = await self._exec_sh(f"cd {proj_dir} && {install_cmd}", timeout=self.INSTALL_TIMEOUT)
            
            if install["exit_code"] != 0:
                return self.fail_response(f"Dependency install failed: {install['output']}")

            # Auto-initialize shadcn/ui for Next.js projects
            success_message = f"Project '{project_name}' created successfully."
            if init_shadcn and template.lower() in ["next14-shadcn", "next"]:
                try:
                    # Check if components.json already exists (from template)
                    components_check = await self._exec_sh(f"test -f {proj_dir}/components.json && echo EXISTS || echo MISSING")
                    
                    if "MISSING" in components_check.get("output", ""):
                        # Initialize shadcn/ui
                        has_src = await self._has_src_directory(proj_dir)
                        css_path = "src/app/globals.css" if has_src else "app/globals.css"
                        
                        config = self.SHADCN_CONFIG_TEMPLATE.copy()
                        config["tailwind"]["css"] = css_path
                        
                        config_json = json.dumps(config, indent=2)
                        write_cmd = f"cd {proj_dir} && cat > components.json << 'EOF'\n{config_json}\nEOF"
                        write_result = await self._exec_sh(write_cmd)
                        
                        if write_result.get("exit_code", 1) == 0:
                            success_message += " shadcn/ui initialized automatically."
                        else:
                            logger.warning(f"Failed to auto-initialize shadcn: {write_result.get('output','')}")
                    else:
                        success_message += " shadcn/ui already configured."
                        
                except Exception as e:
                    logger.warning(f"Failed to auto-initialize shadcn: {e}")
                    # Don't fail the entire project creation for shadcn issues

            return self.success_response({
                "message": success_message,
                "project": project_name
            })

        except Exception as e:
            logger.error(f"Error creating web project: {e}", exc_info=True)
            return self.fail_response(f"Error creating web project: {e}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "init_shadcn",
            "description": "Initialize shadcn/ui in a Next.js project (non-interactive).",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_name": {"type": "string", "description": "Project directory name"}
                },
                "required": ["project_name"]
            }
        }
    })
    @usage_example('''
        <!-- Initialize shadcn/ui in an existing Next.js project -->
        <function_calls>
        <invoke name="init_shadcn">
        <parameter name="project_name">my-existing-app</parameter>
        </invoke>
        </function_calls>
        ''')
    async def init_shadcn(self, project_name: str) -> ToolResult:
        try:
            await self._ensure_sandbox()
            
            if not await self._project_exists(project_name):
                return self.fail_response(f"Project '{project_name}' not found")

            proj_dir = self._get_project_path(project_name)
            
            has_src = await self._has_src_directory(proj_dir)
            css_path = "src/app/globals.css" if has_src else "app/globals.css"
            
            config = self.SHADCN_CONFIG_TEMPLATE.copy()
            config["tailwind"]["css"] = css_path
            
            config_json = json.dumps(config, indent=2)
            write_cmd = f"cd {proj_dir} && cat > components.json << 'EOF'\n{config_json}\nEOF"
            write_result = await self._exec_sh(write_cmd)
            
            if write_result.get("exit_code", 1) != 0:
                return self.fail_response(f"Failed to write components.json: {write_result.get('output','')}")

            verify = await self._exec_sh(f"test -f {proj_dir}/components.json && echo OK || echo MISS")
            if "OK" in verify.get("output", ""):
                return self.success_response(f"shadcn/ui configured successfully in '{project_name}'.")
            
            return self.fail_response("components.json was not created as expected")

        except Exception as e:
            logger.error(f"Error initializing shadcn: {e}", exc_info=True)
            return self.fail_response(f"Error initializing shadcn: {e}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "add_shadcn_components",
            "description": "Add shadcn/ui components to a Next.js project.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_name": {"type": "string"},
                    "components": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Component names, e.g., button, card, form, input, dialog, dropdown-menu"
                    }
                },
                "required": ["project_name", "components"]
            }
        }
    })
    @usage_example('''
        <!-- Add common shadcn/ui components to a project -->
        <function_calls>
        <invoke name="add_shadcn_components">
        <parameter name="project_name">my-app</parameter>
        <parameter name="components">["button", "card", "input", "form", "dialog"]</parameter>
        </invoke>
        </function_calls>
        ''')
    async def add_shadcn_components(self, project_name: str, components: List[str]) -> ToolResult:
        try:
            await self._ensure_sandbox()
            
            if not await self._project_exists(project_name):
                return self.fail_response(f"Project '{project_name}' not found")

            proj_dir = self._get_project_path(project_name)
            
            verify = await self._exec_sh(f"test -f {proj_dir}/components.json && echo OK || echo MISS")
            if "MISS" in verify.get("output", ""):
                init_res = await self.init_shadcn(project_name)
                if not init_res.success:
                    return init_res

            comps = " ".join(components)
            attempts = [
                f"cd {proj_dir} && pnpm dlx shadcn@latest add {comps}",
                f"cd {proj_dir} && npx shadcn@latest add {comps}"
            ]
            
            for cmd in attempts:
                res = await self._exec_sh(cmd, timeout=self.INSTALL_TIMEOUT)
                if res["exit_code"] == 0:
                    return self.success_response(f"Added shadcn components to '{project_name}': {', '.join(components)}")

            return self.fail_response(f"Failed to add components: {res.get('output','') if 'res' in locals() else 'Unknown error'}")

        except Exception as e:
            logger.error(f"Error adding shadcn components: {e}", exc_info=True)
            return self.fail_response(f"Error adding shadcn components: {e}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "add_common_shadcn_components",
            "description": "Add commonly used shadcn/ui components to a Next.js project in one go.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_name": {"type": "string", "description": "Project directory name"}
                },
                "required": ["project_name"]
            }
        }
    })
    @usage_example('''
        <!-- Add all commonly used shadcn/ui components at once -->
        <function_calls>
        <invoke name="add_common_shadcn_components">
        <parameter name="project_name">my-app</parameter>
        </invoke>
        </function_calls>
        ''')
    async def add_common_shadcn_components(self, project_name: str) -> ToolResult:
        """Add commonly used shadcn/ui components: button, card, input, form, dialog, dropdown-menu, badge, avatar."""
        common_components = ["button", "card", "input", "form", "dialog", "dropdown-menu", "badge", "avatar"]
        return await self.add_shadcn_components(project_name, common_components)

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "create_full_stack_project",
            "description": "Create a complete Next.js project with shadcn/ui initialized and common components already added. One-stop setup for rapid development.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_name": {"type": "string", "description": "Project directory name to create"},
                    "package_manager": {"type": "string", "description": "Package manager: pnpm|npm", "default": "pnpm"}
                },
                "required": ["project_name"]
            }
        }
    })
    @usage_example('''
        <!-- Create a complete Next.js project with shadcn/ui and common components -->
        <function_calls>
        <invoke name="create_full_stack_project">
        <parameter name="project_name">my-complete-app</parameter>
        <parameter name="package_manager">pnpm</parameter>
        </invoke>
        </function_calls>
        ''')
    async def create_full_stack_project(self, project_name: str, package_manager: str = "pnpm") -> ToolResult:
        """Create a Next.js project with shadcn/ui and common components pre-installed."""
        try:
            # First create the project with shadcn initialized
            create_result = await self.create_web_project(
                project_name=project_name, 
                template="next14-shadcn", 
                package_manager=package_manager, 
                init_shadcn=True
            )
            
            if not create_result.success:
                return create_result
            
            # Add common components
            components_result = await self.add_common_shadcn_components(project_name)
            
            if components_result.success:
                return self.success_response({
                    "message": f"Complete project '{project_name}' created with shadcn/ui and common components ready to use!",
                    "project": project_name,
                    "components_added": ["button", "card", "input", "form", "dialog", "dropdown-menu", "badge", "avatar"]
                })
            else:
                # Project created successfully, but components failed
                return self.success_response({
                    "message": f"Project '{project_name}' created successfully, but failed to add components. You can add them manually with add_common_shadcn_components.",
                    "project": project_name,
                    "warning": components_result.result
                })
                
        except Exception as e:
            logger.error(f"Error creating full-stack project: {e}", exc_info=True)
            return self.fail_response(f"Error creating full-stack project: {e}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "install_dependencies",
            "description": "Install npm packages in a project using pnpm or npm.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_name": {"type": "string"},
                    "packages": {"type": "array", "items": {"type": "string"}},
                    "dev": {"type": "boolean", "default": False},
                    "package_manager": {"type": "string", "default": "pnpm"}
                },
                "required": ["project_name", "packages"]
            }
        }
    })
    @usage_example('''
        <!-- Install production dependencies in a project -->
        <function_calls>
        <invoke name="install_dependencies">
        <parameter name="project_name">my-app</parameter>
        <parameter name="packages">["axios", "react-query", "framer-motion"]</parameter>
        <parameter name="dev">false</parameter>
        <parameter name="package_manager">pnpm</parameter>
        </invoke>
        </function_calls>
        
        <!-- Install development dependencies -->
        <function_calls>
        <invoke name="install_dependencies">
        <parameter name="project_name">my-app</parameter>
        <parameter name="packages">["@types/node", "eslint", "prettier"]</parameter>
        <parameter name="dev">true</parameter>
        </invoke>
        </function_calls>
        ''')
    async def install_dependencies(self, project_name: str, packages: List[str], dev: bool = False, package_manager: str = "pnpm") -> ToolResult:
        try:
            await self._ensure_sandbox()
            
            if not await self._project_exists(project_name):
                return self.fail_response(f"Project '{project_name}' not found")

            proj_dir = self._get_project_path(project_name)
            pkg_list = " ".join(packages)
            
            command_type = "add_dev" if dev else "add"
            cmd = self._get_package_manager_command(package_manager, command_type, pkg_list)
            
            res = await self._exec_sh(f"cd {proj_dir} && {cmd}", timeout=self.INSTALL_TIMEOUT)
            
            if res["exit_code"] != 0:
                return self.fail_response(f"Package install failed: {res['output']}")
            
            return self.success_response(f"Installed packages in '{project_name}': {', '.join(packages)}")

        except Exception as e:
            logger.error(f"Error installing dependencies: {e}", exc_info=True)
            return self.fail_response(f"Error installing dependencies: {e}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "build_project",
            "description": "Run production build for the project.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_name": {"type": "string"},
                    "package_manager": {"type": "string", "default": "pnpm"}
                },
                "required": ["project_name"]
            }
        }
    })
    @usage_example('''
        <!-- Build a Next.js project for production -->
        <function_calls>
        <invoke name="build_project">
        <parameter name="project_name">my-app</parameter>
        <parameter name="package_manager">pnpm</parameter>
        </invoke>
        </function_calls>
        ''')
    async def build_project(self, project_name: str, package_manager: str = "pnpm") -> ToolResult:
        try:
            await self._ensure_sandbox()
            
            if not await self._project_exists(project_name):
                return self.fail_response(f"Project '{project_name}' not found")

            proj_dir = self._get_project_path(project_name)
            cmd = self._get_package_manager_command(package_manager, "build")
            
            res = await self._exec_sh(f"cd {proj_dir} && {cmd}", timeout=self.BUILD_TIMEOUT)
            
            if res["exit_code"] != 0:
                return self.fail_response(f"Build failed: {res['output']}")
            
            return self.success_response(f"Build completed for '{project_name}'.")

        except Exception as e:
            logger.error(f"Error building project: {e}", exc_info=True)
            return self.fail_response(f"Error building project: {e}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "start_server",
            "description": "Start a server for the project. mode='prod' runs next start after build; mode='dev' runs dev server. Returns exposed preview URL.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_name": {"type": "string"},
                    "mode": {"type": "string", "default": "prod", "description": "prod|dev"},
                    "port": {"type": "integer", "default": 3000},
                    "package_manager": {"type": "string", "default": "pnpm"}
                },
                "required": ["project_name"]
            }
        }
    })
    @usage_example('''
        <!-- Start a development server for testing -->
        <function_calls>
        <invoke name="start_server">
        <parameter name="project_name">my-app</parameter>
        <parameter name="mode">dev</parameter>
        <parameter name="port">3000</parameter>
        </invoke>
        </function_calls>
        
        <!-- Start a production server -->
        <function_calls>
        <invoke name="start_server">
        <parameter name="project_name">my-app</parameter>
        <parameter name="mode">prod</parameter>
        <parameter name="port">8080</parameter>
        <parameter name="package_manager">pnpm</parameter>
        </invoke>
        </function_calls>
        ''')
    async def start_server(self, project_name: str, mode: str = "prod", port: int = DEFAULT_PORT, package_manager: str = "pnpm") -> ToolResult:
        try:
            await self._ensure_sandbox()
            
            if not await self._project_exists(project_name):
                return self.fail_response(f"Project '{project_name}' not found")

            proj_dir = self._get_project_path(project_name)
            
            if mode == "prod":
                build_check = await self._exec_sh(f"test -d {proj_dir}/.next && echo BUILT || echo NOBUILD")
                if "NOBUILD" in build_check.get("output", ""):
                    build_cmd = self._get_package_manager_command(package_manager, "build")
                    build_res = await self._exec_sh(f"cd {proj_dir} && {build_cmd}", timeout=self.BUILD_TIMEOUT)
                    if build_res["exit_code"] != 0:
                        return self.fail_response(f"Build failed before start: {build_res['output']}")
                
                server_cmd = self._get_package_manager_command(package_manager, "start")
            else:
                server_cmd = self._get_package_manager_command(package_manager, "dev")

            cmd = f"cd {proj_dir} && PORT={port} {server_cmd}"
            session_name = f"web_{project_name}_{mode}"
            await self._run_in_tmux_background(session_name, cmd)

            link = await self.sandbox.get_preview_link(port)
            url = link.url if hasattr(link, 'url') else str(link)
            
            return self.success_response({
                "message": f"Started {mode} server for '{project_name}' on port {port}",
                "url": url,
                "port": port,
                "session": session_name
            })

        except Exception as e:
            logger.error(f"Error starting server: {e}", exc_info=True)
            return self.fail_response(f"Error starting server: {e}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "start_dev_server",
            "description": "Start a development server for the project (alias for start_server with mode=dev). Returns exposed preview URL.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_name": {"type": "string"},
                    "port": {"type": "integer", "default": 3000},
                    "package_manager": {"type": "string", "default": "pnpm"}
                },
                "required": ["project_name"]
            }
        }
    })
    @usage_example('''
        <!-- Quickly start a development server with hot reloading -->
        <function_calls>
        <invoke name="start_dev_server">
        <parameter name="project_name">my-app</parameter>
        </invoke>
        </function_calls>
        
        <!-- Start dev server on a custom port -->
        <function_calls>
        <invoke name="start_dev_server">
        <parameter name="project_name">my-app</parameter>
        <parameter name="port">4000</parameter>
        <parameter name="package_manager">npm</parameter>
        </invoke>
        </function_calls>
        ''')
    async def start_dev_server(self, project_name: str, port: int = DEFAULT_PORT, package_manager: str = "pnpm") -> ToolResult:
        return await self.start_server(
            project_name=project_name, 
            mode="dev", 
            port=port, 
            package_manager=package_manager
        ) 