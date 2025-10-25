interface ParsedFile {
  path: string;
  content: string;
  language: string;
}

interface ParsedFolder {
  path: string;
}

export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
  expanded?: boolean;
  content?: string;
  language?: string;
}

export function parseAIResponse(response: string): { files: ParsedFile[]; folders: ParsedFolder[]; explanation: string } {
  const files: ParsedFile[] = [];
  const folders: ParsedFolder[] = [];
  
  // Extract explanation text (everything before first ### FILE:)
  const firstFileIndex = response.indexOf('### FILE:');
  const explanationRaw = firstFileIndex > 0 ? response.substring(0, firstFileIndex) : '';
  const explanation = explanationRaw.replace(/```[\s\S]*?```/g, '').trim();
  
  // Split by file markers
  const filePattern = /###\s*FILE:\s*([^\n]+)\n([\s\S]*?)(?=###\s*FILE:|$)/g;
  let match;
  
  while ((match = filePattern.exec(response)) !== null) {
    const path = match[1].trim();
    let content = match[2].trim();
    
    // Remove markdown code fences if present (keep only inner code)
    const fenced = content.match(/^```[\w-]*\n([\s\S]*?)\n```$/);
    content = fenced ? fenced[1].trim() : content.replace(/^```[\w-]*\n/, '').replace(/\n```$/, '').trim();
    
    // Extract directory path
    const dirPath = path.substring(0, path.lastIndexOf('/'));
    if (dirPath && !folders.some(f => f.path === dirPath)) {
      folders.push({ path: dirPath });
    }
    
    // Determine language from extension
    const extension = path.split('.').pop()?.toLowerCase() || 'text';
    const languageMap: Record<string, string> = {
      'html': 'html',
      'css': 'css',
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'json': 'json',
      'md': 'markdown',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin',
      'toml': 'toml',
    };
    
    files.push({
      path,
      content,
      language: languageMap[extension] || 'text'
    });
  }
  
  return { files, folders, explanation };
}

export function createFileTree(files: ParsedFile[], folders: ParsedFolder[]): FileNode[] {
  const tree: FileNode[] = [];
  const pathMap = new Map<string, FileNode>();
  
  // Create folder nodes
  folders.forEach(folder => {
    const parts = folder.path.split('/');
    let currentPath = '';
    
    parts.forEach((part, index) => {
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      
      if (!pathMap.has(currentPath)) {
        const node: FileNode = {
          name: part,
          type: 'folder',
          path: currentPath,
          children: [],
          expanded: false
        };
        
        pathMap.set(currentPath, node);
        
        if (parentPath) {
          const parent = pathMap.get(parentPath);
          if (parent && parent.children) {
            parent.children.push(node);
          }
        } else {
          tree.push(node);
        }
      }
    });
  });
  
  // Create file nodes
  files.forEach(file => {
    const parts = file.path.split('/');
    const fileName = parts.pop()!;
    const dirPath = parts.join('/');
    
    const fileNode: FileNode = {
      name: fileName,
      type: 'file',
      path: file.path,
      content: file.content,
      language: file.language
    };
    
    if (dirPath) {
      const parent = pathMap.get(dirPath);
      if (parent && parent.children) {
        parent.children.push(fileNode);
      }
    } else {
      tree.push(fileNode);
    }
  });
  
  return tree;
}
