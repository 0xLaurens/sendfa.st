export function truncateFileName(fileName: string): string {
    let extension = fileExtension(fileName);
    if (fileName.length > 25) {
        return fileName.slice(0, 25) + '...' + extension;
    }
    return fileName;
}

function fileExtension(fileName: string): string {
    return fileName.split('.').pop() || '';
}
