import { Injectable, Logger } from '@nestjs/common';

export interface SyncConflict {
  field: string;
  localValue: any;
  remoteValue: any;
  localUpdatedAt: Date;
  remoteUpdatedAt: Date;
}

export interface ConflictResolution {
  strategy: 'LOCAL_WINS' | 'REMOTE_WINS' | 'MERGE' | 'MANUAL';
  resolvedValue: any;
}

@Injectable()
export class ConflictResolutionService {
  private readonly logger = new Logger(ConflictResolutionService.name);

  /**
   * Detect conflicts between local and remote data
   */
  detectConflicts(
    localData: any,
    remoteData: any,
    fields: string[],
  ): SyncConflict[] {
    const conflicts: SyncConflict[] = [];

    for (const field of fields) {
      if (localData[field] !== remoteData[field]) {
        conflicts.push({
          field,
          localValue: localData[field],
          remoteValue: remoteData[field],
          localUpdatedAt: localData.updatedAt,
          remoteUpdatedAt: remoteData.updatedAt,
        });
      }
    }

    return conflicts;
  }

  /**
   * Resolve conflict based on strategy
   */
  resolveConflict(
    conflict: SyncConflict,
    strategy: 'LAST_WRITE_WINS' | 'SOURCE_PRIORITY' = 'LAST_WRITE_WINS',
    preferredSource?: 'local' | 'remote',
  ): ConflictResolution {
    this.logger.debug(
      `Resolving conflict for field: ${conflict.field}`,
    );

    if (strategy === 'LAST_WRITE_WINS') {
      const localIsNewer = conflict.localUpdatedAt > conflict.remoteUpdatedAt;
      return {
        strategy: localIsNewer ? 'LOCAL_WINS' : 'REMOTE_WINS',
        resolvedValue: localIsNewer ? conflict.localValue : conflict.remoteValue,
      };
    }

    if (strategy === 'SOURCE_PRIORITY' && preferredSource) {
      return {
        strategy: preferredSource === 'local' ? 'LOCAL_WINS' : 'REMOTE_WINS',
        resolvedValue: preferredSource === 'local' 
          ? conflict.localValue 
          : conflict.remoteValue,
      };
    }

    // Default to remote wins for auth-related data
    return {
      strategy: 'REMOTE_WINS',
      resolvedValue: conflict.remoteValue,
    };
  }

  /**
   * Merge changes from both sources
   */
  mergeChanges(
    localData: any,
    remoteData: any,
    conflicts: SyncConflict[],
  ): any {
    const merged = { ...localData };

    for (const conflict of conflicts) {
      const resolution = this.resolveConflict(conflict);
      merged[conflict.field] = resolution.resolvedValue;
    }

    return merged;
  }
}