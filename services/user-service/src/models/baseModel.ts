import {
    Model, Column, DataType,
    ForeignKey, BelongsTo,
    BeforeCreate, BeforeUpdate, BeforeDestroy,
    CreatedAt, UpdatedAt, DeletedAt,
} from 'sequelize-typescript';
import {
    CustomCreateOptions,
    CustomSaveOptions,
    CustomDestroyOptions,
} from '@app/shared/interfaces/custom-option.interface';
import User from './user/user.model';

export class BaseModel<T extends {} = any> extends Model<T> {

    // ============================================================================================ Foreign Keys
    @ForeignKey(() => User) @Column({ type: DataType.UUID, allowNull: true })                       declare creator_id: string | null;
    @ForeignKey(() => User) @Column({ type: DataType.UUID, allowNull: true })                       declare updater_id: string | null;
    @ForeignKey(() => User) @Column({ type: DataType.UUID, allowNull: true })                       declare deleter_id: string | null;

    // ============================================================================================ Timestamps
    @CreatedAt                                                                                      declare created_at: Date;
    @UpdatedAt                                                                                      declare updated_at: Date;
    @DeletedAt                                                                                      declare deleted_at: Date | null;

    // ============================================================================================ Many to One
    @BelongsTo(() => User, { foreignKey: 'creator_id', as: 'creator' })                            declare creator: User;
    @BelongsTo(() => User, { foreignKey: 'updater_id', as: 'updater' })                            declare updater: User;
    @BelongsTo(() => User, { foreignKey: 'deleter_id', as: 'deleter' })                            declare deleter: User;

    // ============================================================================================ Hooks
    @BeforeCreate
    static async setCreatorId(instance: BaseModel, options: CustomCreateOptions) {
        if (options.user_id) {
            instance.creator_id = options.user_id;
            instance.updater_id = options.user_id;
        }
    }

    @BeforeUpdate
    static async setUpdaterId(instance: BaseModel, options: CustomSaveOptions) {
        if (options.user_id) {
            instance.updater_id = options.user_id;
        }
    }

    @BeforeDestroy
    static async setDeleterId(instance: BaseModel, options: CustomDestroyOptions) {
        if (options.user_id) {
            instance.deleter_id = options.user_id;
            await instance.save({ transaction: options.transaction });
        }
    }
}