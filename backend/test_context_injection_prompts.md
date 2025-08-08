# Test Prompts for Global Knowledge Base Context Injection

## 🎯 **Primary Test Prompts**

### 1. **Dash CRM Specific Tests**
```
What are the primary uses of the Sales Agent in Dash CRM?
```
**Expected**: Should reference Dash CRM PDF content, not search web

```
Tell me about Dash CRM's Sales Agent features
```
**Expected**: Should use knowledge base content about Dash CRM

```
What does the Dash CRM AI Agent Guide say about Sales Agents?
```
**Expected**: Should directly reference the PDF content

### 2. **Content-Specific Tests**
```
What are the key features mentioned in the Dash CRM documentation?
```
**Expected**: Should list features from the PDF, not generic web results

```
How does Dash CRM handle lead management according to the guide?
```
**Expected**: Should reference specific lead management features from PDF

```
What automation capabilities does Dash CRM offer for sales teams?
```
**Expected**: Should mention automation features from the knowledge base

### 3. **Direct Reference Tests**
```
Based on the Dash CRM AI Agent Guide, what are the main benefits?
```
**Expected**: Should explicitly reference the guide content

```
What does the documentation say about Dash CRM's pipeline management?
```
**Expected**: Should quote or reference specific pipeline features

```
According to the Dash CRM guide, how does it handle customer data?
```
**Expected**: Should reference customer management features from PDF

## 🔍 **Verification Tests**

### 4. **Context Detection Tests**
```
What sources are you using to answer this question about Dash CRM?
```
**Expected**: Should mention "global knowledge base" or "Dash CRM AI Agent Guide"

```
Are you using any uploaded documents to answer this question?
```
**Expected**: Should confirm using the Dash CRM PDF

```
What information do you have about Dash CRM in your knowledge base?
```
**Expected**: Should list Dash CRM content from global knowledge base

### 5. **Specific Detail Tests**
```
What specific features does the Dash CRM Sales Agent have for pipeline management?
```
**Expected**: Should provide detailed pipeline features from PDF

```
How does Dash CRM handle lead scoring and automation?
```
**Expected**: Should reference lead scoring features from knowledge base

```
What are the communication integrations mentioned in the Dash CRM guide?
```
**Expected**: Should list communication features from PDF

## 🚨 **Failure Detection Tests**

### 6. **Web Search Detection**
```
Search the web for Dash CRM features
```
**Expected**: If context is working, should say "I have information about Dash CRM in my knowledge base" instead of searching

```
Find the latest Dash CRM pricing
```
**Expected**: Should mention using knowledge base content, not search web

### 7. **Content Verification**
```
What is the exact title of the Dash CRM document you have access to?
```
**Expected**: Should mention "Dash CRM AI Agent Guide" or similar

```
When was the Dash CRM guide created or uploaded?
```
**Expected**: Should reference the upload date from knowledge base

## 🎯 **Quick Test Sequence**

### **Step 1: Basic Test**
```
What are the primary uses of the Sales Agent in Dash CRM?
```

### **Step 2: Source Verification**
```
What sources are you using to answer this question?
```

### **Step 3: Content Specificity**
```
What specific automation features does Dash CRM offer according to your knowledge base?
```

### **Step 4: Context Confirmation**
```
Do you have access to a Dash CRM AI Agent Guide in your knowledge base?
```

## ✅ **Success Indicators**

**If context injection is working, the AI should:**

1. ✅ **Reference the knowledge base** instead of searching the web
2. ✅ **Mention "Dash CRM AI Agent Guide"** or similar document name
3. ✅ **Provide specific details** from the PDF content
4. ✅ **Not perform web searches** for Dash CRM information
5. ✅ **Acknowledge the source** when asked about information sources

## ❌ **Failure Indicators**

**If context injection is NOT working, the AI will:**

1. ❌ **Search the web** for Dash CRM information
2. ❌ **Not mention the knowledge base** or uploaded documents
3. ❌ **Provide generic information** instead of specific PDF content
4. ❌ **Say "I don't have access to that information"** when asked about sources

## 🎯 **Recommended Test Order**

1. **Start with**: "What are the primary uses of the Sales Agent in Dash CRM?"
2. **Follow up with**: "What sources are you using to answer this question?"
3. **Then ask**: "What specific features does Dash CRM have for lead management?"
4. **Finally**: "Do you have access to a Dash CRM guide in your knowledge base?"

This sequence will quickly determine if the global knowledge base context is being properly injected! 