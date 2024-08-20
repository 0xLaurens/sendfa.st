export function formatFileSize(bytes: number | undefined) {
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    if (bytes === 0 || bytes === undefined) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const formattedSize = parseFloat((bytes / Math.pow(1024, i)).toFixed(2));
    return `${formattedSize} ${sizes[i]}`;
}