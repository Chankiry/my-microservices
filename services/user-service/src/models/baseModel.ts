import {
    Model, Column, DataType,
    ForeignKey, BelongsTo,
    BeforeCreate, BeforeUpdate, BeforeDestroy,
    CreatedAt, UpdatedAt, DeletedAt,
} from 'sequelize-typescript';
import {
    CustomCreateOptions,
    CustomDestroyOptions,
    CustomUpdateOptions,
} from '@app/shared/interfaces/custom-option.interface';
import type User from './user/user.model';

export class BaseModel<T> extends Model<T> {

    // ============================================================================================ Foreign Keys
    @ForeignKey(() => require('./user/user.model').default) @Column({ type: DataType.UUID, allowNull: true })                       declare creator_id: string | null;
    @ForeignKey(() => require('./user/user.model').default) @Column({ type: DataType.UUID, allowNull: true })                       declare updater_id: string | null;
    @ForeignKey(() => require('./user/user.model').default) @Column({ type: DataType.UUID, allowNull: true })                       declare deleter_id: string | null;

    // ============================================================================================ Timestamps
    @CreatedAt                                                                                                                      declare created_at: Date | null;
    @UpdatedAt                                                                                                                      declare updated_at: Date | null;
    @DeletedAt                                                                                                                      declare deleted_at: Date | null;

    // ============================================================================================ Many to One
    @BelongsTo(() => require('./user/user.model').default, { foreignKey: 'creator_id', as: 'creator' })                             declare creator: User | null;
    @BelongsTo(() => require('./user/user.model').default, { foreignKey: 'updater_id', as: 'updater' })                             declare updater: User | null;
    @BelongsTo(() => require('./user/user.model').default, { foreignKey: 'deleter_id', as: 'deleter' })                             declare deleter: User | null;

    // ============================================================================================ Hooks
    @BeforeCreate
    static async setCreatorId(instance: BaseModel<any>, options: CustomCreateOptions) {
        if (options.user_id) {
            instance.creator_id = options.user_id;
            instance.updater_id = options.user_id;
        }
    }

    @BeforeUpdate
    static async setUpdaterId(instance: BaseModel<any>, options: CustomUpdateOptions) {
        if (options.user_id) {
            instance.updater_id = options.user_id;
        }
    }

    @BeforeDestroy
    static async setDeleterId(instance: BaseModel<any>, options: CustomDestroyOptions) {
        if (options.user_id) {
            instance.deleter_id = options.user_id;
            await instance.save({ transaction: options.transaction });
        }
    }
}