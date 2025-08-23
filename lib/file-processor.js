import fs from 'fs';
import path from 'path';

export const CONFIG = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    CHUNK_SIZE: 2000,
    CHUNK_OVERLAP: 200,
    MAX_CHUNK_SIZE: 4000,
    MIN_CHUNK_SIZE: 100,
    BATCH_SIZE: 100,
    EMBEDDING_DIMENSIONS: 768
};

export function detectFileType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath).toLowerCase();

    if (['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt'].includes(ext)) {
        return 'code';
    }

    if (['.md', '.txt', '.rst', '.adoc'].includes(ext)) {
        return 'documentation';
    }

    if (['.json', '.yaml', '.yml', '.xml', '.csv', '.toml'].includes(ext)) {
        return 'data';
    }

    if (fileName === 'dockerfile' || fileName.startsWith('dockerfile.') || fileName === 'makefile') {
        return 'config';
    }

    if (['.env', '.gitignore', '.dockerignore', '.editorconfig', '.prettierrc', '.eslintrc', '.babelrc'].includes(ext) ||
        fileName.startsWith('.env') || fileName.endsWith('rc') || fileName.endsWith('config')) {
        return 'config';
    }

    return 'text';
}

export function isBinaryFile(filePath) {
    try {
        const fd = fs.openSync(filePath, 'r');
        const buffer = Buffer.alloc(1024);
        const bytesRead = fs.readSync(fd, buffer, 0, 1024, 0);
        fs.closeSync(fd);

        if (bytesRead === 0) return false;

        for (let i = 0; i < bytesRead; i++) {
            if (buffer[i] === 0) return true;
        }

        let nonPrintable = 0;
        for (let i = 0; i < bytesRead; i++) {
            const byte = buffer[i];
            if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
                nonPrintable++;
            }
        }

        return (nonPrintable / bytesRead) > 0.3;
    } catch (error) {
        return true;
    }
}

export function shouldIndexFile(filePath, projectRoot = process.cwd()) {
    const fileName = path.basename(filePath);

    if (isBinaryFile(filePath)) return false;

    const defaultExcludes = [
        'node_modules', '.git', 'dist', 'build', '.env', '.env.*',
        '*.log', '*.tmp', '*.cache', '.DS_Store', 'Thumbs.db',
        '.vscode', '.idea', '__pycache__', '*.pyc', '.pytest_cache',
        'target/', 'bin/', 'obj/', '.gradle/', '.mvn/'
    ];

    const relativePath = path.relative(projectRoot, filePath);

    return !defaultExcludes.some(pattern => {
        if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            return regex.test(fileName) || regex.test(relativePath);
        }
        return relativePath.includes(pattern) || fileName.includes(pattern);
    });
}

export async function discoverIndexableFiles(targetPath, isFile = false) {
    if (isFile) {
        if (shouldIndexFile(targetPath)) {
            const fileType = detectFileType(targetPath);
            return [{path: targetPath, type: fileType}];
        } else {
            return [];
        }
    }

    return scanDirectoryForFiles(targetPath);
}

export function scanDirectoryForFiles(targetPath) {
    const files = [];
    
    try {
        const entries = fs.readdirSync(targetPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(targetPath, entry.name);
            
            if (entry.isFile()) {
                if (shouldIndexFile(fullPath)) {
                    files.push({
                        path: fullPath,
                        type: detectFileType(fullPath)
                    });
                }
            } else if (entry.isDirectory()) {
                if (shouldIndexFile(fullPath)) {
                    files.push(...scanDirectoryForFiles(fullPath));
                }
            }
        }
    } catch (error) {
        console.error(`Error scanning directory ${targetPath}:`, error.message);
    }
    
    return files;
}

export function chunkContent(content, chunkSize = CONFIG.CHUNK_SIZE, overlap = CONFIG.CHUNK_OVERLAP) {
    const chunks = [];
    let start = 0;

    while (start < content.length) {
        const end = Math.min(start + chunkSize, content.length);
        const chunkText = content.slice(start, end);
        
        chunks.push({
            index: chunks.length,
            text: chunkText,
            start,
            end,
            size: chunkText.length
        });

        start = end - overlap;
        if (start >= content.length) break;
    }

    return chunks;
}

export function validateFile(filePath, maxSize = CONFIG.MAX_FILE_SIZE) {
    try {
        const stats = fs.statSync(filePath);
        
        if (!stats.isFile()) {
            throw new Error('Path is not a file');
        }
        
        if (stats.size > maxSize) {
            throw new Error(`File size (${stats.size}) exceeds maximum (${maxSize})`);
        }
        
        return {
            valid: true,
            size: stats.size,
            modified: stats.mtime
        };
    } catch (error) {
        if (error.code === 'ENOENT') {
            return {
                valid: false,
                error: 'File not found'
            };
        }
        return {
            valid: false,
            error: error.message
        };
    }
}

export function extractMetadata(filePath, content) {
    try {
        const stats = fs.statSync(filePath);
        const lines = content.split('\n');
        const words = content.split(/\s+/).filter(w => w.length > 0);

        return {
            path: filePath,
            name: path.basename(filePath),
            size: stats.size,
            lines: lines.length,
            words: words.length,
            characters: content.length,
            modified: stats.mtime,
            type: detectFileType(filePath)
        };
    } catch (error) {
        return {
            path: filePath,
            name: path.basename(filePath),
            error: error.message
        };
    }
}

export async function extractCodeStructure(content, fileType) {
    if (!content || typeof content !== 'string') {
        return null;
    }

    const structure = {
        classes: [],
        functions: [],
        variables: [],
        imports: [],
        exports: []
    };

    // Use regex-based extraction (simpler and no memory issues)
    return extractCodeStructureRegex(content);
}

function extractCodeStructureRegex(content) {
    const structure = {
        classes: [],
        functions: [],
        variables: [],
        imports: [],
        exports: []
    };

    const lines = content.split('\n');

    lines.forEach((line, index) => {
        // Class extraction
        const classMatch = line.match(/class\s+(\w+)/);
        if (classMatch) {
            structure.classes.push({
                name: classMatch[1],
                line: index + 1,
                methods: []
            });
        }

        // Function extraction
        const funcMatch = line.match(/(async\s+)?function\s+(\w+)/) || 
                         line.match(/(async\s+)?(\w+)\s*\([^)]*\)\s*=>/) ||
                         line.match(/(\w+)\s*:\s*(async\s+)?function/);
        if (funcMatch) {
            const name = funcMatch[2] || funcMatch[1];
            structure.functions.push({
                name,
                line: index + 1,
                async: funcMatch[0].includes('async')
            });
        }

        // Import extraction
        const importMatch = line.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/) ||
                           line.match(/const\s+\w+\s*=\s*require\(['"]([^'"]+)['"]\)/);
        if (importMatch) {
            structure.imports.push({
                source: importMatch[1],
                line: index + 1,
                specifiers: []
            });
        }

        // Export extraction
        if (line.includes('export')) {
            structure.exports.push({
                type: line.includes('export default') ? 'default' : 'named',
                line: index + 1
            });
        }
    });

    return structure;
}