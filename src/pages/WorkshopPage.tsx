import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles, PanelLeftOpen, RefreshCw, Monitor, Tablet, Smartphone, Github, Database, File, Folder, ChevronRight, ChevronDown, FileText, FolderPlus } from 'lucide-react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { PromptBox } from '../components/PromptBox';
import { TypingAnimation } from '../components/TypingAnimation';
import { CodeTypingAnimation } from '../components/CodeTypingAnimation';
import { supabase } from '@/integrations/supabase/client';
import { parseAIResponse, createFileTree } from '../utils/codeParser';
import { toast } from '@/hooks/use-toast';

interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

type ViewportSize = 'desktop' | 'tablet' | 'mobile';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
  expanded?: boolean;
  content?: string;
  language?: string;
}

export function WorkshopPage() {
  const location = useLocation();
  const initialMessage = location.state?.initialMessage;
  const initialFile = location.state?.initialFile;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI coding assistant. I can help you write code, debug issues, and build applications. What would you like to create today?',
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewCode, setPreviewCode] = useState('');
  const [chatWidth, setChatWidth] = useState(384);
  const [fileExplorerWidth, setFileExplorerWidth] = useState(250);
  const [isResizingChat, setIsResizingChat] = useState(false);
  const [isResizingFileExplorer, setIsResizingFileExplorer] = useState(false);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [codeViewTab, setCodeViewTab] = useState<'code' | 'files' | 'terminal'>('code');
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [conversationHistory, setConversationHistory] = useState<AIMessage[]>([]);
  const [terminalOutput, setTerminalOutput] = useState<string[]>(['Terminal ready. Type commands below.']);
  const [isTypingCode, setIsTypingCode] = useState(false);
  const [terminalInput, setTerminalInput] = useState('');
  const [isGeneratingFiles, setIsGeneratingFiles] = useState(false);
  const [currentGeneratingFile, setCurrentGeneratingFile] = useState('');
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path?: string; type?: 'file' | 'folder' } | null>(null);
  const [showNewItemDialog, setShowNewItemDialog] = useState<{ type: 'file' | 'folder'; parentPath?: string } | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [viewportSize, setViewportSize] = useState<ViewportSize>('desktop');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasProcessedInitialMessage = useRef(false);
  const projectName = "My AI Project";

  useEffect(() => {
    if (initialMessage && !hasProcessedInitialMessage.current) {
      hasProcessedInitialMessage.current = true;
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: initialMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);

      (async () => {
        try {
          const statusMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Generating your application...',
            timestamp: new Date(),
            isTyping: true
          };
          setMessages(prev => [...prev, statusMessage]);

          const { data, error } = await supabase.functions.invoke('ai-code-generator', {
            body: { 
              messages: [{ role: 'user', content: initialMessage }]
            }
          });

          if (error) throw error;
          const response = data.content;

          setConversationHistory([
            { role: 'user', content: initialMessage },
            { role: 'assistant', content: response }
          ]);

          const { files, folders, explanation } = parseAIResponse(response);
          if (files.length > 0) {
            const summaryText = explanation || `Generated ${files.length} file(s). Check the Code section to view them.`;
            setMessages(prev => prev.map(m =>
              m.id === statusMessage.id
                ? { ...m, content: summaryText, isTyping: false }
                : m
            ));

            setIsGeneratingFiles(true);
            setActiveTab('code');
            setCodeViewTab('files');

            const tree = createFileTree(files, folders);
            setFileTree(tree);

            for (let i = 0; i < files.length; i++) {
              setCurrentGeneratingFile(files[i].path);
              await new Promise(resolve => setTimeout(resolve, 300));
            }

            setIsGeneratingFiles(false);
            setCurrentGeneratingFile('');

            // Build complete preview from all files
            console.log('Building preview with', files.length, 'files');
            const preview = buildPreviewFromFiles(files);
            setPreviewCode(preview);
            
            // Switch to preview tab to show the app
            setTimeout(() => {
              setActiveTab('preview');
            }, 500);
            
            // Auto-select first file for editing with typing animation
            if (tree.length > 0) {
              const firstFile = tree.find(n => n.type === 'file') || (tree[0].children?.find(n => n.type === 'file'));
              if (firstFile) {
                setIsTypingCode(true);
                setSelectedFile(firstFile);
              }
            }
          } else {
            setMessages(prev => prev.map(m =>
              m.id === statusMessage.id
                ? { ...m, content: response, isTyping: false }
                : m
            ));
          }
          setIsLoading(false);
        } catch (error) {
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `Error: ${error instanceof Error ? error.message : 'Failed to process request'}`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, errorMessage]);
          setIsLoading(false);
        }
      })();
    }
  }, [initialMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const getViewportWidth = () => {
    switch (viewportSize) {
      case 'mobile':
        return '375px';
      case 'tablet':
        return '768px';
      case 'desktop':
      default:
        return '100%';
    }
  };

  const toggleFolder = (path: string) => {
    const updateTree = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.path === path && node.type === 'folder') {
          return { ...node, expanded: !node.expanded };
        }
        if (node.children) {
          return { ...node, children: updateTree(node.children) };
        }
        return node;
      });
    };
    setFileTree(updateTree(fileTree));
  };

  const handleContextMenu = (e: React.MouseEvent, node?: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      path: node?.path,
      type: node?.type
    });
  };

  const createNewItem = (type: 'file' | 'folder', parentPath?: string) => {
    if (!newItemName.trim()) return;

    const newNode: FileNode = {
      name: newItemName,
      type: type,
      path: parentPath ? `${parentPath}/${newItemName}` : newItemName,
      ...(type === 'folder' && { children: [], expanded: false })
    };

    if (!parentPath) {
      setFileTree([...fileTree, newNode]);
    } else {
      const addToTree = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.path === parentPath && node.type === 'folder') {
            return {
              ...node,
              children: [...(node.children || []), newNode],
              expanded: true
            };
          }
          if (node.children) {
            return { ...node, children: addToTree(node.children) };
          }
          return node;
        });
      };
      setFileTree(addToTree(fileTree));
    }

    setShowNewItemDialog(null);
    setNewItemName('');
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const buildPreviewFromFiles = (files: any[]) => {
    console.log('Building preview from files:', files.map(f => f.path));
    
    const htmlFile = files.find(f => 
      f.language === 'html' || 
      f.path.endsWith('.html') || 
      f.name?.endsWith('.html')
    );
    
    const cssFiles = files.filter(f => 
      f.language === 'css' || 
      f.path.endsWith('.css') || 
      f.name?.endsWith('.css')
    );
    
    const jsFiles = files.filter(f => 
      f.language === 'javascript' || 
      f.language === 'typescript' || 
      f.path.endsWith('.js') || 
      f.path.endsWith('.ts') ||
      f.name?.endsWith('.js') ||
      f.name?.endsWith('.ts')
    );
    
    console.log('HTML file:', htmlFile?.path);
    console.log('CSS files:', cssFiles.map(f => f.path));
    console.log('JS files:', jsFiles.map(f => f.path));
    
    if (!htmlFile) {
      // If no HTML file, create a basic structure
      console.log('No HTML file found, creating basic structure');
      let combinedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated Project</title>
  <style>
    ${cssFiles.map(f => f.content).join('\n')}
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    ${jsFiles.map(f => f.content).join('\n')}
  </script>
</body>
</html>`;
      return combinedHtml;
    }
    
    // Start with HTML content
    let html = htmlFile.content;
    
    // Make sure we have a proper HTML structure
    if (!html.includes('<!DOCTYPE')) {
      html = `<!DOCTYPE html>\n${html}`;
    }
    
    // Inject CSS into HTML (before </head> or after <head>)
    if (cssFiles.length > 0) {
      const cssContent = `<style>\n${cssFiles.map(f => f.content).join('\n')}\n</style>`;
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${cssContent}\n</head>`);
      } else if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>\n${cssContent}`);
      } else {
        // No head tag, add it
        html = html.replace('<html', `<html>\n<head>\n${cssContent}\n</head>\n<body`);
      }
    }
    
    // Inject JS into HTML (before </body> or after <body>)
    if (jsFiles.length > 0) {
      const jsContent = `<script>\n${jsFiles.map(f => f.content).join('\n')}\n</script>`;
      if (html.includes('</body>')) {
        html = html.replace('</body>', `${jsContent}\n</body>`);
      } else if (html.includes('<body')) {
        // Find the end of body tag and append
        const bodyMatch = html.match(/<body[^>]*>/);
        if (bodyMatch) {
          const insertPos = html.indexOf(bodyMatch[0]) + bodyMatch[0].length;
          html = html.slice(0, insertPos) + '\n' + jsContent + '\n' + html.slice(insertPos);
        }
      } else {
        // No body tag, append at the end
        html = `${html}\n${jsContent}`;
      }
    }
    
    console.log('Preview HTML generated, length:', html.length);
    return html;
  };

  const handleFileClick = (node: FileNode) => {
    if (node.type === 'file') {
      setSelectedFile(node);
      if (isMobile) {
        setCodeViewTab('code');
      }
    } else {
      toggleFolder(node.path);
    }
  };

  const renderFileTree = (nodes: FileNode[], depth = 0): JSX.Element[] => {
    return nodes.map((node) => (
      <div key={node.path}>
        <div
          className={`flex items-center px-2 py-1 hover:bg-gray-800 cursor-pointer text-cyan-300 text-sm ${
            selectedFile?.path === node.path ? 'bg-gray-800' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => handleFileClick(node)}
          onContextMenu={(e) => handleContextMenu(e, node)}
        >
          {node.type === 'folder' ? (
            <>
              {node.expanded ? (
                <ChevronDown className="w-4 h-4 mr-1" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-1" />
              )}
              <Folder className="w-4 h-4 mr-2 text-cyan-500" />
            </>
          ) : (
            <File className="w-4 h-4 mr-2 ml-5 text-cyan-400" />
          )}
          <span>{node.name}</span>
        </div>
        {node.type === 'folder' && node.expanded && node.children && (
          <div>{renderFileTree(node.children, depth + 1)}</div>
        )}
      </div>
    ));
  };

  const handleTerminalCommand = async (command: string) => {
    if (!command.trim()) return;

    setTerminalOutput(prev => [...prev, `$ ${command}`]);
    setTerminalInput('');

    const cmd = command.trim().toLowerCase();

    if (cmd === 'clear' || cmd === 'cls') {
      setTerminalOutput(['Terminal ready. Type commands below.']);
      return;
    }

    if (cmd === 'npm install' || cmd === 'npm i') {
      setTerminalOutput(prev => [...prev, 'Installing Node.js packages...']);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTerminalOutput(prev => [...prev, 'added 1234 packages in 5.2s', '✓ Node.js packages installed successfully']);
      return;
    }

    if (cmd.startsWith('npm install ') || cmd.startsWith('npm i ')) {
      const pkg = cmd.split(' ').slice(-1)[0];
      setTerminalOutput(prev => [...prev, `Installing ${pkg}...`]);
      await new Promise(resolve => setTimeout(resolve, 800));
      setTerminalOutput(prev => [...prev, `✓ ${pkg} installed successfully`]);
      return;
    }

    if (cmd === 'npm run build') {
      setTerminalOutput(prev => [...prev, 'Building project...']);
      await new Promise(resolve => setTimeout(resolve, 1500));
      setTerminalOutput(prev => [...prev, '✓ Build completed successfully']);
      return;
    }

    if (cmd === 'ls' || cmd === 'dir') {
      const fileList = fileTree.map(f => f.name).join('  ');
      setTerminalOutput(prev => [...prev, fileList || 'No files yet']);
      return;
    }

    if (cmd === 'help') {
      setTerminalOutput(prev => [
        ...prev,
        'Available commands:',
        '  npm install - Install Node.js packages',
        '  npm run build - Build the project',
        '  ls / dir - List files',
        '  clear / cls - Clear terminal',
        '  help - Show this help message'
      ]);
      return;
    }

    setTerminalOutput(prev => [...prev, `Command not found: ${command}. Type 'help' for available commands.`]);
  };

  const handleTerminalKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTerminalCommand(terminalInput);
    }
  };

  const handlePublish = async () => {
    if (!previewCode) {
      toast({
        title: "No Code to Deploy",
        description: "Generate an app first before publishing.",
        variant: "destructive"
      });
      setTerminalOutput(prev => [...prev, '❌ No code to deploy. Generate an app first.']);
      return;
    }

    setIsDeploying(true);
    setTerminalOutput(prev => [...prev, '🚀 Starting deployment to Netlify...']);
    
    toast({
      title: "Deploying...",
      description: "Your app is being deployed to Netlify"
    });

    try {
      const { data, error } = await supabase.functions.invoke('deploy-to-netlify', {
        body: { 
          htmlContent: previewCode,
          siteName: `astra-app-${Date.now()}`
        }
      });

      if (error) throw error;

      if (data.success) {
        setDeploymentUrl(data.url);
        setTerminalOutput(prev => [
          ...prev, 
          `✅ Deployed successfully!`,
          `🔗 Your app is live at: ${data.url}`,
          `📝 Site ID: ${data.siteId}`
        ]);
        
        toast({
          title: "Deployment Successful! 🎉",
          description: (
            <div className="flex flex-col gap-2">
              <p>Your app is now live!</p>
              <a 
                href={data.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                {data.url}
              </a>
            </div>
          ),
        });
      } else {
        throw new Error(data.error || 'Deployment failed');
      }

    } catch (error) {
      console.error('Deployment error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setTerminalOutput(prev => [
        ...prev, 
        `❌ Deployment failed: ${errorMsg}`
      ]);
      
      toast({
        title: "Deployment Failed",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setIsDeploying(false);
    }
  };

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalOutput]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingChat) {
        const newWidth = e.clientX;
        if (newWidth >= 300 && newWidth <= 600) {
          setChatWidth(newWidth);
        }
      }
      if (isResizingFileExplorer) {
        const rect = document.querySelector('.file-explorer')?.getBoundingClientRect();
        if (rect) {
          const newWidth = e.clientX - rect.left;
          if (newWidth >= 200 && newWidth <= 400) {
            setFileExplorerWidth(newWidth);
          }
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizingChat(false);
      setIsResizingFileExplorer(false);
    };

    if (isResizingChat || isResizingFileExplorer) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizingChat, isResizingFileExplorer]);

  return (
    <div className="h-screen flex flex-col bg-black animate-fade-in">
      {!isMobile && (
        <div className="h-14 bg-black border-b border-cyan-900/50 flex items-center justify-between px-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-500 rounded-lg shadow-lg shadow-cyan-500/50">
              <Sparkles className="w-4 h-4 text-black" />
            </div>
            <span className="text-cyan-400 font-bold tracking-wide">{projectName}</span>
          </div>

          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="p-2 text-cyan-400 hover:text-cyan-300 rounded-lg transition-all border border-cyan-900/50"
            title={isChatOpen ? 'Close chat' : 'Open chat'}
          >
            <PanelLeftOpen className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {isChatOpen && (
          <>
            <div
              className={`bg-black border-r border-cyan-900/50 flex flex-col ${isMobile ? 'fixed inset-0 z-40' : ''}`}
              style={isMobile ? {} : { width: `${chatWidth}px` }}
            >
              {isMobile && (
                <>
                  <div className="bg-black border-b border-cyan-900/50 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-cyan-500 rounded-lg shadow-lg shadow-cyan-500/50">
                        <Sparkles className="w-4 h-4 text-black" />
                      </div>
                      <span className="text-cyan-400 font-bold tracking-wide">{projectName}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button
                        className="p-1.5 text-cyan-400 hover:text-cyan-300 rounded-lg transition-all border border-cyan-900/50"
                        title="Connect to Database"
                      >
                        <Database className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1.5 text-cyan-400 hover:text-cyan-300 rounded-lg transition-all border border-cyan-900/50"
                        title="Connect to GitHub"
                      >
                        <Github className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={handlePublish}
                        disabled={isDeploying || !previewCode}
                        className="px-2.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg font-medium transition-all text-xs shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDeploying ? 'Deploying...' : 'Publish'}
                      </button>
                    </div>
                  </div>
                  <div className="bg-black border-b border-cyan-900/50 px-4 py-3">
                    <div className="flex gap-[5px] bg-gray-900 rounded-lg p-1 border border-cyan-900/50">
                      <button
                        onClick={() => {
                          setActiveTab('preview');
                          setIsChatOpen(false);
                        }}
                        className={`flex-1 px-3 py-2 rounded-md transition-all duration-200 text-sm font-medium ${
                          activeTab === 'preview' && !isChatOpen
                            ? 'bg-cyan-500 text-black'
                            : 'text-cyan-400 hover:text-cyan-300'
                        }`}
                      >
                        Preview
                      </button>
                      <button
                        className={`flex-1 px-3 py-2 rounded-md transition-all duration-200 text-sm font-medium ${
                          isChatOpen
                            ? 'bg-cyan-500 text-black'
                            : 'text-cyan-400 hover:text-cyan-300'
                        }`}
                      >
                        Chat
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('code');
                          setIsChatOpen(false);
                        }}
                        className={`flex-1 px-3 py-2 rounded-md transition-all duration-200 text-sm font-medium ${
                          activeTab === 'code' && !isChatOpen
                            ? 'bg-cyan-500 text-black'
                            : 'text-cyan-400 hover:text-cyan-300'
                        }`}
                      >
                        Code
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 overflow-hidden ${
                        message.role === 'user'
                          ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/30'
                          : 'bg-gray-900 text-cyan-100 border border-cyan-900/50'
                      }`}
                      style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                    >
                      {message.isTyping ? (
                        <div className="text-sm leading-relaxed">
                          <TypingAnimation
                            text={message.role === 'assistant' ? ((message.content.includes('### FILE:') ? message.content.split('### FILE:')[0] : message.content).replace(/```[\s\S]*?```/g, '').trim()) : message.content}
                            speed={5}
                            onComplete={() => {
                              setMessages(prev => prev.map(m =>
                                m.id === message.id ? { ...m, isTyping: false } : m
                              ));
                            }}
                          />
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{message.role === 'assistant' ? ((message.content.includes('### FILE:') ? message.content.split('### FILE:')[0] : message.content).replace(/```[\s\S]*?```/g, '').trim()) : message.content}</p>
                      )}
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-900 border border-cyan-900/50 rounded-2xl px-4 py-3">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-cyan-900/50 bg-black">
                <PromptBox
                  onSendMessage={(message, file) => {
                    if (!message.trim() || isLoading) return;

                    const userMessage: Message = {
                      id: Date.now().toString(),
                      role: 'user',
                      content: message,
                      timestamp: new Date()
                    };

                    setMessages(prev => [...prev, userMessage]);
                    setIsLoading(true);

                    (async () => {
                      const newHistory: AIMessage[] = [
                        ...conversationHistory,
                        { role: 'user', content: message }
                      ];

                      try {
                        const { data, error } = await supabase.functions.invoke('ai-code-generator', {
                          body: { messages: newHistory }
                        });

                        if (error) throw error;
                        const response = data.content;
                        setConversationHistory([...newHistory, { role: 'assistant', content: response }]);

                        const { files, folders, explanation } = parseAIResponse(response);
                        if (files.length > 0) {
                          // Show explanation in chat, code in editor
                          const summaryText = explanation || `Generated ${files.length} file(s). Check the Code section to view them.`;
                          const assistantMessage: Message = {
                            id: (Date.now() + 1).toString(),
                            role: 'assistant',
                            content: summaryText,
                            timestamp: new Date(),
                            isTyping: true
                          };
                          setMessages(prev => [...prev, assistantMessage]);

                          const tree = createFileTree(files, folders);
                          setFileTree(tree);

                          // Build complete preview from all files
                          console.log('Building preview with', files.length, 'files');
                          const preview = buildPreviewFromFiles(files);
                          setPreviewCode(preview);
                          
                          // Show preview
                          setTimeout(() => {
                            setActiveTab('preview');
                          }, 500);
                          
                          // Auto-select first file for editing with typing animation
                          if (tree.length > 0) {
                            const firstFile = tree.find(n => n.type === 'file') || (tree[0].children?.find(n => n.type === 'file'));
                            if (firstFile) {
                              setIsTypingCode(true);
                              setSelectedFile(firstFile);
                            }
                          }
                        } else {
                          // No code generated, show text response
                          const assistantMessage: Message = {
                            id: (Date.now() + 1).toString(),
                            role: 'assistant',
                            content: response,
                            timestamp: new Date(),
                            isTyping: true
                          };
                          setMessages(prev => [...prev, assistantMessage]);
                        }
                        setIsLoading(false);
                      } catch (error) {
                        const errorMessage: Message = {
                          id: (Date.now() + 1).toString(),
                          role: 'assistant',
                          content: `Error: ${error instanceof Error ? error.message : 'Failed to process request'}`,
                          timestamp: new Date()
                        };
                        setMessages(prev => [...prev, errorMessage]);
                        setIsLoading(false);
                      }
                    })();
                  }}
                  isProcessing={isLoading}
                />
              </div>
            </div>
            {!isMobile && (
              <div
                className="w-1 bg-cyan-900/50 hover:bg-cyan-500 cursor-col-resize transition-colors"
                onMouseDown={() => setIsResizingChat(true)}
              />
            )}
          </>
        )}

        <div className={`flex-1 flex flex-col bg-black ${isMobile && isChatOpen ? 'hidden' : ''}`}>
          <div className="bg-black border-b border-cyan-900/50 px-4 py-3">
            <div className="flex items-center justify-between">
              {isMobile ? (
                <>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-cyan-500 rounded-lg shadow-lg shadow-cyan-500/50">
                      <Sparkles className="w-4 h-4 text-black" />
                    </div>
                    <span className="text-cyan-400 font-bold tracking-wide">{projectName}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {activeTab === 'preview' && (
                      <>
                        <button
                          className="p-1.5 text-cyan-400 hover:text-cyan-300 rounded-lg transition-all border border-cyan-900/50"
                          title="Connect to Database"
                        >
                          <Database className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="p-1.5 text-cyan-400 hover:text-cyan-300 rounded-lg transition-all border border-cyan-900/50"
                          title="Connect to GitHub"
                        >
                          <Github className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={handlePublish}
                          disabled={isDeploying || !previewCode}
                          className="px-2.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg font-medium transition-all text-xs shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isDeploying ? 'Deploying...' : 'Publish'}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setIsChatOpen(true)}
                      className="p-1.5 text-cyan-400 hover:text-cyan-300 rounded-lg transition-all border border-cyan-900/50"
                      title="Open chat"
                    >
                      <PanelLeftOpen className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex bg-gray-900 rounded-lg p-1 border border-cyan-900/50">
                    <button
                      onClick={() => setActiveTab('preview')}
                      className={`px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium ${
                        activeTab === 'preview'
                          ? 'bg-cyan-500 text-black'
                          : 'text-cyan-400 hover:text-cyan-300'
                      }`}
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => setActiveTab('code')}
                      className={`px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium ${
                        activeTab === 'code'
                          ? 'bg-cyan-500 text-black'
                          : 'text-cyan-400 hover:text-cyan-300'
                      }`}
                    >
                      Code
                    </button>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleRefresh}
                      className="p-2 text-cyan-400 hover:text-cyan-300 rounded-lg transition-all border border-cyan-900/50"
                      title="Refresh preview"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <div className="bg-gray-900 border border-cyan-900/50 px-3 py-2 rounded-lg flex items-center space-x-2 text-cyan-400 text-sm">
                      <span>/webpage</span>
                    </div>
                    <div className="flex bg-gray-900 border border-cyan-900/50 rounded-lg p-1">
                      <button
                        onClick={() => setViewportSize('desktop')}
                        className={`p-2 rounded-md transition-all ${
                          viewportSize === 'desktop'
                            ? 'bg-cyan-500 text-black'
                            : 'text-cyan-400 hover:text-cyan-300'
                        }`}
                        title="Desktop view"
                      >
                        <Monitor className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewportSize('tablet')}
                        className={`p-2 rounded-md transition-all ${
                          viewportSize === 'tablet'
                            ? 'bg-cyan-500 text-black'
                            : 'text-cyan-400 hover:text-cyan-300'
                        }`}
                        title="Tablet view"
                      >
                        <Tablet className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewportSize('mobile')}
                        className={`p-2 rounded-md transition-all ${
                          viewportSize === 'mobile'
                            ? 'bg-cyan-500 text-black'
                            : 'text-cyan-400 hover:text-cyan-300'
                        }`}
                        title="Mobile view"
                      >
                        <Smartphone className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      className="p-2 text-cyan-400 hover:text-cyan-300 rounded-lg transition-all border border-cyan-900/50"
                      title="Connect to Database"
                    >
                      <Database className="w-5 h-5" />
                    </button>
                    <button
                      className="p-2 text-cyan-400 hover:text-cyan-300 rounded-lg transition-all border border-cyan-900/50"
                      title="Connect to GitHub"
                    >
                      <Github className="w-5 h-5" />
                    </button>
                    <button
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg font-medium transition-all text-sm shadow-lg shadow-cyan-500/30"
                    >
                      Publish
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {isMobile && activeTab === 'code' && (
            <div className="bg-black border-b border-cyan-900/50 px-4 py-2">
              <div className="flex bg-gray-900 rounded-lg p-1 border border-cyan-900/50">
                <button
                  onClick={() => setCodeViewTab('code')}
                  className={`flex-1 px-3 py-2 rounded-md transition-all duration-200 text-xs font-medium ${
                    codeViewTab === 'code'
                      ? 'bg-cyan-500 text-black'
                      : 'text-cyan-400 hover:text-cyan-300'
                  }`}
                >
                  Code
                </button>
                <button
                  onClick={() => setCodeViewTab('files')}
                  className={`flex-1 px-3 py-2 rounded-md transition-all duration-200 text-xs font-medium ${
                    codeViewTab === 'files'
                      ? 'bg-cyan-500 text-black'
                      : 'text-cyan-400 hover:text-cyan-300'
                  }`}
                >
                  Files
                </button>
                <button
                  onClick={() => setCodeViewTab('terminal')}
                  className={`flex-1 px-3 py-2 rounded-md transition-all duration-200 text-xs font-medium ${
                    codeViewTab === 'terminal'
                      ? 'bg-cyan-500 text-black'
                      : 'text-cyan-400 hover:text-cyan-300'
                  }`}
                >
                  Terminal
                </button>
              </div>
            </div>
          )}

          {!isMobile && activeTab === 'code' && (
            <div className="bg-black border-b border-cyan-900/50 px-4 py-2">
              <div className="flex bg-gray-900 rounded-lg p-1 border border-cyan-900/50 w-fit">
                <button
                  onClick={() => setCodeViewTab('code')}
                  className={`px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium ${
                    codeViewTab === 'code'
                      ? 'bg-cyan-500 text-black'
                      : 'text-cyan-400 hover:text-cyan-300'
                  }`}
                >
                  Code
                </button>
                <button
                  onClick={() => setCodeViewTab('files')}
                  className={`px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium ${
                    codeViewTab === 'files'
                      ? 'bg-cyan-500 text-black'
                      : 'text-cyan-400 hover:text-cyan-300'
                  }`}
                >
                  Files
                </button>
                <button
                  onClick={() => setCodeViewTab('terminal')}
                  className={`px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium ${
                    codeViewTab === 'terminal'
                      ? 'bg-cyan-500 text-black'
                      : 'text-cyan-400 hover:text-cyan-300'
                  }`}
                >
                  Terminal
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 bg-gray-900 overflow-hidden flex">
            {activeTab === 'code' && !isMobile && (
              <>
                <div className="file-explorer bg-black border-r border-cyan-900/50 flex flex-col" style={{ width: `${fileExplorerWidth}px` }}>
                  <div className="p-3 border-b border-cyan-900/50 flex items-center justify-between">
                    <h3 className="text-cyan-400 font-semibold text-sm">Explorer</h3>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setShowNewItemDialog({ type: 'file' })}
                        className="p-1.5 text-cyan-400 hover:bg-gray-800 rounded transition-all"
                        title="New File"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setShowNewItemDialog({ type: 'folder' })}
                        className="p-1.5 text-cyan-400 hover:bg-gray-800 rounded transition-all"
                        title="New Folder"
                      >
                        <FolderPlus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div
                    className="flex-1 overflow-y-auto py-2"
                    onContextMenu={(e) => handleContextMenu(e)}
                  >
                    {fileTree.length === 0 ? (
                      <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
                        Click + to create files
                      </div>
                    ) : (
                      renderFileTree(fileTree)
                    )}
                  </div>
                </div>
                <div
                  className="w-1 bg-cyan-900/50 hover:bg-cyan-500 cursor-col-resize transition-colors"
                  onMouseDown={() => setIsResizingFileExplorer(true)}
                />
              </>
            )}
            {isMobile && activeTab === 'code' && codeViewTab === 'files' && (
              <div className="file-explorer bg-black flex flex-col w-full">
                <div className="p-3 border-b border-cyan-900/50 flex items-center justify-between">
                  <h3 className="text-cyan-400 font-semibold text-sm">Explorer</h3>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setShowNewItemDialog({ type: 'file' })}
                      className="p-1.5 text-cyan-400 hover:bg-gray-800 rounded transition-all"
                      title="New File"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowNewItemDialog({ type: 'folder' })}
                      className="p-1.5 text-cyan-400 hover:bg-gray-800 rounded transition-all"
                      title="New Folder"
                    >
                      <FolderPlus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div
                  className="flex-1 overflow-y-auto py-2"
                  onContextMenu={(e) => handleContextMenu(e)}
                >
                  {fileTree.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
                      Click + to create files
                    </div>
                  ) : (
                    renderFileTree(fileTree)
                  )}
                </div>
              </div>
            )}
            <div className={`flex-1 flex items-center justify-center ${isMobile ? 'p-0' : 'p-4'} ${isMobile && activeTab === 'code' && (codeViewTab === 'files' || codeViewTab === 'terminal') ? 'hidden' : ''}`}>
              {activeTab === 'preview' ? (
                previewCode ? (
                  <div
                    className={`bg-white h-full transition-all duration-300 ${isMobile ? '' : 'shadow-2xl shadow-cyan-500/20 border border-cyan-900/50'}`}
                    style={isMobile ? { width: '100%' } : { width: getViewportWidth(), maxWidth: '100%' }}
                  >
                    <iframe
                      key={refreshKey}
                      srcDoc={previewCode}
                      className="w-full h-full border-0"
                      title="Preview"
                      sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
                    />
                  </div>
                ) : (
                  <div className="text-center">
                    <Sparkles className="w-16 h-16 text-cyan-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-cyan-400 mb-2">No Preview Yet</h2>
                    <p className="text-gray-500">Ask me to build something to see it here</p>
                  </div>
                )
              ) : (
                <div className={`w-full h-full bg-black ${isMobile ? 'p-0' : ''}`}>
                  {codeViewTab === 'code' && selectedFile ? (
                    isTypingCode ? (
                      <div className="h-full w-full bg-[#1e1e1e] p-4 font-mono text-sm text-gray-300 overflow-auto">
                        <CodeTypingAnimation
                          code={selectedFile.content || ''}
                          speed={2}
                          onComplete={() => setIsTypingCode(false)}
                        />
                      </div>
                    ) : (
                      <Editor
                        height="100%"
                        language={selectedFile.language || 'plaintext'}
                        value={selectedFile.content || ''}
                        theme="vs-dark"
                        options={{
                          readOnly: false,
                          minimap: { enabled: false },
                          fontSize: 14,
                          lineNumbers: 'on',
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          tabSize: 2,
                          wordWrap: 'on',
                          formatOnPaste: true,
                          formatOnType: true,
                        }}
                        onMount={(editor, monaco) => {
                          // Configure language features
                          monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                            noSemanticValidation: false,
                            noSyntaxValidation: false
                          });
                          
                          monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                            noSemanticValidation: false,
                            noSyntaxValidation: false
                          });
                          
                          // Configure compiler options
                          monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
                            target: monaco.languages.typescript.ScriptTarget.ES2020,
                            allowNonTsExtensions: true,
                            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
                            module: monaco.languages.typescript.ModuleKind.CommonJS,
                            noEmit: true,
                            esModuleInterop: true,
                            jsx: monaco.languages.typescript.JsxEmit.React,
                            reactNamespace: 'React',
                            allowJs: true,
                            typeRoots: ['node_modules/@types']
                          });
                          
                          // Focus editor
                          editor.focus();
                        }}
                        onChange={(value) => {
                          if (selectedFile) {
                            // Update both selected file and file tree
                            const updatedFile = { ...selectedFile, content: value || '' };
                            setSelectedFile(updatedFile);
                            
                            // Update in file tree
                            const updateFileInTree = (nodes: FileNode[]): FileNode[] => {
                              return nodes.map(node => {
                                if (node.path === selectedFile.path) {
                                  return updatedFile;
                                }
                                if (node.children) {
                                  return { ...node, children: updateFileInTree(node.children) };
                                }
                                return node;
                              });
                            };
                            setFileTree(updateFileInTree(fileTree));
                            
                            // Rebuild preview if it's an HTML/CSS/JS file
                            const extension = selectedFile.path.split('.').pop()?.toLowerCase();
                            if (['html', 'css', 'js', 'ts'].includes(extension || '')) {
                              const getAllFiles = (nodes: FileNode[]): any[] => {
                                let files: any[] = [];
                                nodes.forEach(node => {
                                  if (node.type === 'file' && node.content) {
                                    files.push(node);
                                  }
                                  if (node.children) {
                                    files = files.concat(getAllFiles(node.children));
                                  }
                                });
                                return files;
                              };
                              
                              const updatedTree = updateFileInTree(fileTree);
                              const allFiles = getAllFiles(updatedTree);
                              const newPreview = buildPreviewFromFiles(allFiles);
                              setPreviewCode(newPreview);
                            }
                          }
                        }}
                      />
                    )
                  ) : codeViewTab === 'code' && !selectedFile ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <File className="w-16 h-16 text-cyan-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-cyan-400 mb-2">No File Selected</h2>
                        <p className="text-gray-500">Select a file from the explorer or start coding with AI</p>
                      </div>
                    </div>
                  ) : codeViewTab === 'files' && isGeneratingFiles ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center px-8">
                        <Sparkles className="w-16 h-16 text-cyan-500 mx-auto mb-4 animate-pulse" />
                        <h2 className="text-2xl font-bold text-cyan-400 mb-4">Generating Files...</h2>
                        <div className="bg-gray-900 border border-cyan-900/50 rounded-lg p-4 text-left">
                          <TypingAnimation
                            text={`Creating: ${currentGeneratingFile}`}
                            speed={20}
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            {isMobile && activeTab === 'code' && codeViewTab === 'terminal' && (
              <div className="w-full h-full bg-black flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
                  {terminalOutput.map((line, index) => (
                    <div key={index} className={`${line.startsWith('$') ? 'text-cyan-400' : line.startsWith('✓') ? 'text-green-400' : 'text-gray-300'} mb-1`}>
                      {line}
                    </div>
                  ))}
                  <div ref={terminalEndRef} />
                </div>
                <div className="border-t border-cyan-900/50 p-4 flex items-center space-x-2">
                  <span className="text-cyan-400 font-mono">$</span>
                  <input
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    onKeyPress={handleTerminalKeyPress}
                    placeholder="Type a command..."
                    className="flex-1 bg-transparent text-cyan-100 font-mono text-sm focus:outline-none placeholder-gray-600"
                  />
                </div>
              </div>
            )}
            {!isMobile && activeTab === 'code' && codeViewTab === 'terminal' && (
              <div className="w-full h-full bg-black flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
                  {terminalOutput.map((line, index) => (
                    <div key={index} className={`${line.startsWith('$') ? 'text-cyan-400' : line.startsWith('✓') ? 'text-green-400' : 'text-gray-300'} mb-1`}>
                      {line}
                    </div>
                  ))}
                  <div ref={terminalEndRef} />
                </div>
                <div className="border-t border-cyan-900/50 p-4 flex items-center space-x-2">
                  <span className="text-cyan-400 font-mono">$</span>
                  <input
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    onKeyPress={handleTerminalKeyPress}
                    placeholder="Type a command (try 'help' for available commands)..."
                    className="flex-1 bg-transparent text-cyan-100 font-mono text-sm focus:outline-none placeholder-gray-600"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {contextMenu && (
        <div
          className="fixed bg-gray-900 border border-cyan-900/50 rounded-lg shadow-xl py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.type === 'folder' && (
            <>
              <button
                onClick={() => {
                  setShowNewItemDialog({ type: 'file', parentPath: contextMenu.path });
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-cyan-300 hover:bg-gray-800 text-sm flex items-center space-x-2"
              >
                <File className="w-4 h-4" />
                <span>New File</span>
              </button>
              <button
                onClick={() => {
                  setShowNewItemDialog({ type: 'folder', parentPath: contextMenu.path });
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-cyan-300 hover:bg-gray-800 text-sm flex items-center space-x-2"
              >
                <Folder className="w-4 h-4" />
                <span>New Folder</span>
              </button>
            </>
          )}
          {!contextMenu.path && (
            <>
              <button
                onClick={() => {
                  setShowNewItemDialog({ type: 'file' });
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-cyan-300 hover:bg-gray-800 text-sm flex items-center space-x-2"
              >
                <File className="w-4 h-4" />
                <span>New File</span>
              </button>
              <button
                onClick={() => {
                  setShowNewItemDialog({ type: 'folder' });
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-cyan-300 hover:bg-gray-800 text-sm flex items-center space-x-2"
              >
                <Folder className="w-4 h-4" />
                <span>New Folder</span>
              </button>
            </>
          )}
        </div>
      )}

      {showNewItemDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-cyan-900/50 rounded-lg p-6 w-96">
            <h3 className="text-cyan-400 font-semibold mb-4">
              Create New {showNewItemDialog.type === 'file' ? 'File' : 'Folder'}
            </h3>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  createNewItem(showNewItemDialog.type, showNewItemDialog.parentPath);
                }
              }}
              placeholder={`Enter ${showNewItemDialog.type} name...`}
              className="w-full bg-black border border-cyan-900/50 text-cyan-100 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-gray-600"
              autoFocus
            />
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => {
                  setShowNewItemDialog(null);
                  setNewItemName('');
                }}
                className="px-4 py-2 bg-gray-800 text-cyan-300 rounded-lg hover:bg-gray-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => createNewItem(showNewItemDialog.type, showNewItemDialog.parentPath)}
                className="px-4 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-all"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
