# Helium AI Technical Code Index

## Backend Architecture Deep Dive

### FastAPI Application Structure (`backend/api.py`)

#### Main Application Setup
```python
# Core FastAPI app with lifespan management
app = FastAPI(lifespan=lifespan)

# Middleware configuration
- CORS with environment-specific origins
- Request logging with structured context
- Rate limiting and IP tracking
- Authentication validation

# Router organization
- Unified API router with modular includes
- No individual prefixes for clean URLs
- Centralized error handling
```

#### Service Initialization Pattern
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Database connection
    await db.initialize()
    
    # Service initialization
    agent_api.initialize(db, instance_id)
    sandbox_api.initialize(db)
    triggers_api.initialize(db)
    
    # Background task setup
    # Graceful cleanup on shutdown
```

### Agent System Architecture (`backend/agent/`)

#### Core Components
1. **API Layer** (`api.py`)
   - Agent creation and management
   - Thread initialization
   - Message handling
   - Streaming responses

2. **Configuration Management** (`config_helper.py`)
   - Agent config extraction
   - MCP configuration handling
   - Tool configuration parsing

3. **Versioning System** (`versioning/`)
   - Agent version management
   - Version history tracking
   - Active version switching

#### Tool System Architecture
```python
# Base tool class hierarchy
class AgentBuilderBaseTool(Tool):
    def __init__(self, thread_manager, db_connection, agent_id):
        self.thread_manager = thread_manager
        self.db = db_connection
        self.agent_id = agent_id
    
    async def _get_current_account_id(self) -> str:
        # Context-aware account resolution
        # Thread-based account identification
```

#### Tool Categories & Implementations

**Browser Automation** (`sb_browser_tool.py`)
```python
class SandboxBrowserTool(SandboxToolsBase):
    # Web automation capabilities
    - Page navigation and interaction
    - Screenshot capture
    - Form filling and submission
    - Data extraction
    
    # Security features
    - Base64 image validation
    - Size and format restrictions
    - Path sanitization
```

**File Management** (`sb_files_tool.py`)
```python
class SandboxFilesTool(SandboxToolsBase):
    # File operations
    - Read/write operations
    - Directory management
    - File upload/download
    - Archive handling
    
    # Security
    - Path validation
    - File type restrictions
    - Size limits
```

**Code Execution** (`sb_shell_tool.py`)
```python
class SandboxShellTool(SandboxToolsBase):
    # Command execution
    - Shell command running
    - Process management
    - Output capture
    - Error handling
    
    # Safety
    - Command whitelisting
    - Resource limits
    - Timeout enforcement
```

### AgentPress Framework (`backend/agentpress/`)

#### Thread Management (`thread_manager.py`)
```python
class ThreadManager:
    def __init__(self, trace=None, is_agent_builder=False, 
                 target_agent_id=None, agent_config=None):
        # Core components
        self.db = DBConnection()
        self.tool_registry = ToolRegistry()
        self.context_manager = ContextManager()
        self.response_processor = ResponseProcessor()
    
    async def create_thread(self, account_id=None, project_id=None, 
                           is_public=False, metadata=None) -> str:
        # Thread creation with metadata
        # Account and project association
        # Public/private visibility control
```

#### Tool Registry System (`tool_registry.py`)
```python
class ToolRegistry:
    def register_tool(self, tool_class, function_names=None, **kwargs):
        # Dynamic tool registration
        # Function name filtering
        # Configuration injection
    
    def get_tool(self, tool_name):
        # Tool lookup and instantiation
        # Context-aware tool creation
```

#### Context Management (`context_manager.py`)
```python
class ContextManager:
    # Memory management
    - Context summarization
    - Token limit handling
    - Conversation history
    - Metadata storage
```

### Sandbox System (`backend/sandbox/`)

#### Daytona Integration
```python
from daytona_sdk import AsyncSandbox

# Sandbox lifecycle management
- Creation and initialization
- Resource allocation
- Tool execution environment
- Cleanup and resource release
```

#### Security Features
```python
async def verify_sandbox_access(client, sandbox_id, user_id=None):
    # Access control
    - Project ownership verification
    - Public/private resource handling
    - User permission validation
    - Account membership checks
```

### Database Layer (`backend/supabase/`)

#### Migration Patterns
```sql
-- Idempotent migration structure
BEGIN;
-- Table creation with IF NOT EXISTS
-- Index creation with IF NOT EXISTS
-- Policy management with DROP IF EXISTS
-- Trigger setup with proper cleanup
COMMIT;
```

#### Row Level Security (RLS)
```sql
-- Example RLS policy
CREATE POLICY agents_select_own ON agents
    FOR SELECT
    USING (basejump.has_role_on_account(account_id));

-- Function-based access control
CREATE OR REPLACE FUNCTION basejump.has_role_on_account(
    account_id UUID, 
    role_name TEXT DEFAULT 'member'
) RETURNS BOOLEAN;
```

#### Schema Design Patterns
```sql
-- UUID primary keys
agent_id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- JSONB for flexible configuration
configured_mcps JSONB DEFAULT '[]'::jsonb

-- Timestamp management
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()

-- Foreign key relationships
account_id UUID NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE
```

### Service Layer (`backend/services/`)

#### Redis Integration (`redis.py`)
```python
class RedisService:
    async def initialize_async(self):
        # Connection pool setup
        # Health check configuration
        # Error handling and reconnection
    
    async def get_client(self):
        # Client acquisition
        # Connection validation
        # Pool management
```

#### Supabase Integration (`supabase.py`)
```python
class DBConnection:
    def __init__(self):
        # Connection configuration
        # Client initialization
        # Health monitoring
    
    async def initialize(self):
        # Connection establishment
        # Schema validation
        # Migration checks
```

#### LLM Integration (`llm.py`)
```python
async def make_llm_api_call(messages, model_name, temperature=0.7, 
                           max_tokens=None, stream=False):
    # LiteLLM integration
    # Provider selection
    # Rate limiting
    # Error handling
    # Streaming support
```

## Frontend Architecture Deep Dive

### Next.js App Structure (`frontend/src/app/`)

#### App Router Organization
```
src/app/
├── (dashboard)/           # Dashboard route group
│   ├── (personalAccount)/ # Personal account routes
│   ├── (teamAccount)/     # Team account routes
│   ├── agents/            # Agent management
│   ├── dashboard/         # Main dashboard
│   ├── projects/          # Project management
│   └── settings/          # User settings
├── (home)/                # Public home routes
├── api/                   # API route handlers
├── auth/                  # Authentication routes
└── layout.tsx             # Root layout
```

#### Layout System
```typescript
// Root layout with providers
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <ThemeProvider>
            {children}
            <Toaster />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
```

### Component Architecture (`frontend/src/components/`)

#### Component Organization
```
components/
├── ui/                    # shadcn/ui components
├── agents/                # Agent-related components
├── auth/                  # Authentication components
├── dashboard/             # Dashboard components
├── thread/                # Chat thread components
├── sidebar/               # Navigation components
├── billing/               # Subscription components
└── shared/                # Reusable components
```

#### Component Patterns

**Agent Builder Chat** (`agents/agent-builder-chat.tsx`)
```typescript
export const AgentBuilderChat = React.memo(function AgentBuilderChat({
  agentId,
  formData,
  handleFieldChange,
  handleStyleChange,
  currentStyle
}: AgentBuilderChatProps) {
  // State management
  const [threadId, setThreadId] = useState<string | null>(null);
  const [agentRunId, setAgentRunId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  
  // React Query hooks
  const initiateAgentMutation = useInitiateAgentWithInvalidation();
  const addUserMessageMutation = useAddUserMessageMutation();
  
  // Effect management
  useEffect(() => {
    // Component lifecycle management
    // State synchronization
    // Cleanup handling
  }, [agentId]);
});
```

**Thread Management** (`thread/content/ThreadContent.tsx`)
```typescript
export function ThreadContent({ 
  messages, 
  onMessageUpdate, 
  onMessageDelete 
}: ThreadContentProps) {
  // Message rendering
  // Tool call handling
  // File display
  // Interactive elements
}
```

### State Management (`frontend/src/hooks/`)

#### React Query Integration
```typescript
// Query key management
export const agentKeys = {
  all: ['agents'] as const,
  lists: () => [...agentKeys.all, 'list'] as const,
  list: (filters: string) => [...agentKeys.lists(), { filters }] as const,
  details: () => [...agentKeys.all, 'detail'] as const,
  detail: (id: string) => [...agentKeys.details(), id] as const,
};

// Custom hooks
export function useAgentBuilderChatHistory(agentId: string) {
  return useQuery({
    queryKey: agentKeys.detail(agentId),
    queryFn: () => agentService.getAgentBuilderChatHistory(agentId),
    enabled: !!agentId,
  });
}
```

#### Agent Streaming (`useAgentStream.ts`)
```typescript
export function useAgentStream(
  callbacks: AgentStreamCallbacks,
  threadId: string,
  setMessages: (messages: UnifiedMessage[]) => void,
): UseAgentStreamResult {
  // Streaming state management
  const [status, setStatus] = useState<string>('idle');
  const [textContent, setTextContent] = useState<Array<{content: string, sequence?: number}>>([]);
  
  // Stream management
  const startStreaming = useCallback((runId: string) => {
    // Stream initialization
    // Event handling
    // Error management
  }, []);
  
  // Cleanup and lifecycle
  useEffect(() => {
    return () => {
      // Stream cleanup
      // Resource management
    };
  }, []);
}
```

### API Layer (`frontend/src/lib/`)

#### API Client (`api-client.ts`)
```typescript
export const apiClient = {
  async request<T = any>(
    url: string,
    options: RequestInit & ApiClientOptions = {}
  ): Promise<ApiResponse<T>> {
    // Request configuration
    const {
      showErrors = true,
      errorContext,
      timeout = 30000,
      ...fetchOptions
    } = options;
    
    // Authentication handling
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    // Request execution
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Response handling
    // Error processing
    // Type safety
  }
};
```

#### Supabase Integration (`supabase/`)
```typescript
// Client creation
export function createClient() {
  return createClientComponentClient<Database>({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  });
}

// Server-side client
export function createServerClient(cookieStore: ReturnType<typeof cookies>) {
  return createServerComponentClient<Database>({ cookies: () => cookieStore });
}
```

## SDK Architecture (`sdk/`)

### Python SDK Structure
```python
# Main SDK class
class Kortix:
    def __init__(self, api_key: str, api_url="https://he2.ai/api"):
        self._agents_client = agents.create_agents_client(api_url, api_key)
        self._threads_client = threads.create_threads_client(api_url, api_key)
        
        # High-level interfaces
        self.Agent = KortixAgent(self._agents_client)
        self.Thread = KortixThread(self._threads_client)

# API client creation
def create_agents_client(api_url: str, api_key: str) -> AgentsClient:
    return AgentsClient(api_url, api_key)
```

### API Client Patterns
```python
class AgentsClient:
    def __init__(self, api_url: str, api_key: str):
        self.api_url = api_url
        self.api_key = api_key
        self.session = httpx.AsyncClient()
    
    async def create_agent(self, agent_data: dict) -> dict:
        # Request construction
        # Authentication
        # Response handling
        # Error management
```

## Configuration Management

### Environment Configuration (`backend/utils/config.py`)
```python
class Configuration:
    # Environment mode
    ENV_MODE: EnvMode = EnvMode.LOCAL
    
    # Stripe configuration
    STRIPE_FREE_TIER_ID_PROD: str = 'price_1RILb4G6l1KZGqIrK4QLrx9i'
    STRIPE_TIER_2_20_ID_PROD: str = 'price_1RILb4G6l1KZGqIrhomjgDnO'
    
    # Computed properties
    @property
    def STRIPE_FREE_TIER_ID(self) -> str:
        if self.ENV_MODE == EnvMode.STAGING:
            return self.STRIPE_FREE_TIER_ID_STAGING
        return self.STRIPE_FREE_TIER_ID_PROD
```

### Frontend Configuration
```typescript
// Environment variables
export const siteConfig = {
  name: "Helium AI",
  description: "The God Mode Agent for Enterprises",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://he2.ai",
  ogImage: "https://he2.ai/og.jpg",
  links: {
    twitter: "https://twitter.com/neuralarc_ai",
    github: "https://github.com/neuralarc-ai/he2",
  },
} as const;
```

## Security Implementation

### Authentication Flow
```typescript
// JWT validation
export async function getCurrentUser(request: Request): Promise<UserClaims | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  const token = authHeader.substring(7);
  try {
    // Token validation without signature verification (Supabase)
    const decoded = jwt.decode(token) as UserClaims;
    return decoded;
  } catch (error) {
    return null;
  }
}
```

### Row Level Security
```sql
-- User access control
CREATE POLICY "Users can access their own data" ON threads
    FOR ALL USING (
        account_id IN (
            SELECT account_id FROM basejump.account_members 
            WHERE user_id = auth.uid()
        )
    );

-- Admin access
CREATE POLICY "Admins can access all data" ON threads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM basejump.account_members 
            WHERE user_id = auth.uid() AND role = 'owner'
        )
    );
```

## Error Handling Patterns

### Backend Error Handling
```python
# Structured error responses
class ToolResult:
    def __init__(self, success: bool, result: Any = None, 
                 message: str = "", error: str = ""):
        self.success = success
        self.result = result
        self.message = message
        self.error = error
    
    @classmethod
    def success_response(cls, result: Any, message: str = "") -> 'ToolResult':
        return cls(success=True, result=result, message=message)
    
    @classmethod
    def fail_response(cls, error: str) -> 'ToolResult':
        return cls(success=False, error=error)
```

### Frontend Error Handling
```typescript
// Error boundary pattern
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }
}
```

## Performance Optimizations

### Backend Optimizations
```python
# Connection pooling
class DBConnection:
    def __init__(self):
        self._pool = None
        self._client = None
    
    async def get_client(self):
        if not self._client:
            # Connection establishment
            # Pool configuration
            # Health monitoring
        return self._client

# Async processing
async def process_agent_run(agent_run_id: str):
    # Concurrent tool execution
    # Resource management
    # Timeout handling
```

### Frontend Optimizations
```typescript
// React.memo for expensive components
export const AgentBuilderChat = React.memo(function AgentBuilderChat({
  agentId,
  formData,
  handleFieldChange,
  handleStyleChange,
  currentStyle
}: AgentBuilderChatProps) {
  // Component implementation
});

// useMemo for expensive calculations
const orderedTextContent = useMemo(() => {
  return textContent
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
    .reduce((acc, curr) => acc + curr.content, '');
}, [textContent]);

// useCallback for stable references
const scrollToBottom = useCallback(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, []);
```

## Testing Patterns

### Backend Testing
```python
# pytest fixtures
@pytest.fixture
async def db_connection():
    db = DBConnection()
    await db.initialize()
    yield db
    await db.disconnect()

@pytest.fixture
def mock_llm():
    with patch('services.llm.make_llm_api_call') as mock:
        mock.return_value = "Mock LLM response"
        yield mock
```

### Frontend Testing
```typescript
// Component testing
describe('AgentBuilderChat', () => {
  it('should render agent builder interface', () => {
    render(<AgentBuilderChat {...defaultProps} />);
    expect(screen.getByText('Agent Builder')).toBeInTheDocument();
  });
  
  it('should handle agent creation', async () => {
    // Test implementation
  });
});
```

## Deployment & Infrastructure

### Docker Configuration
```dockerfile
# Multi-stage build
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim AS backend-production
WORKDIR /app
COPY backend/ ./
EXPOSE 8000
CMD ["gunicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Health Checks
```python
@api_router.get("/health")
async def health_check():
    return {
        "status": "ok", 
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "instance_id": instance_id
    }

@api_router.get("/health-docker")
async def health_check():
    # Comprehensive health check
    # Redis connectivity
    # Database connectivity
    # Service status
```

---

*This technical index provides detailed implementation patterns and architectural decisions for the Helium AI codebase. For specific implementation details, refer to the source code and component documentation.*
