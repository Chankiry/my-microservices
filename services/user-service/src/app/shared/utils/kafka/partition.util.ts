export function calculatePartition(
    key: string,
    numPartitions: number,
): number {
  // Simple hash-based partition assignment
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = (hash * 31 + key.charCodeAt(i)) % numPartitions;
    }
    return Math.abs(hash);
}