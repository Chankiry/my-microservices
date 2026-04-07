// ================================================================================================= Third Party Library
import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Table } from 'sequelize-typescript';

// ================================================================================================= Custom Library

import { BaseModel } from '@models/baseModel';
import User from './user.model';

@Table({ 
    tableName: 'departments',
    timestamps: true,
    createdAt : 'created_at',
    updatedAt : 'updated_at',
    deletedAt : 'deleted_at',
    paranoid  : true,
 })
class Department extends BaseModel<Department> {
    
    // ============================================================================================ Primary Key
    @Column({ primaryKey: true, type: DataType.UUID,defaultValue: DataType.UUIDV4})                 declare id: string;

    // ============================================================================================ Foreign Keys
    @ForeignKey(() => Department) @Column({ type: DataType.UUID, allowNull: true })                 declare parent_id: string | null;

    // ============================================================================================ Fields
    @Column({ allowNull: true, type: DataType.STRING(255) })                                        declare parent_string: string;
    @Column({ allowNull: false, type: DataType.STRING(100) })                                       declare name_kh: string;
    @Column({ allowNull: false, type: DataType.STRING(100) })                                       declare name_en: string;

    // ============================================================================================ Many to One
    @BelongsTo(() => Department, { foreignKey: 'parent_id', as: 'parent' })                         declare parent: Department;
    
    // ============================================================================================ One to Many
    @HasMany(() => Department, { foreignKey: 'parent_id', as: 'sub_departments' })                  declare sub_departments: Department[];
    @HasMany(() => User,       { foreignKey: 'department_id', as: 'users' })                        declare users: User[];
    
}

export default Department;
