export function truncateFileName(fileName: string | undefined): string {
    if (!fileName) {
        return '';
    }
    let extension = fileExtension(fileName);
    if (fileName.length > 25) {
        return fileName.slice(0, 25) + '...' + extension;
    }
    return fileName;
}

function fileExtension(fileName: string): string {
    return fileName.split('.').pop() || '';
}
