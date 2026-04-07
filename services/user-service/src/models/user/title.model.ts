// ================================================================================================= Third Party Library
import { Column, DataType, ForeignKey, HasMany, Model, Table } from 'sequelize-typescript';

// ================================================================================================= Custom Library

import { BaseModel } from '@models/baseModel';

@Table({ 
    tableName: 'titles',
    timestamps: true,
    createdAt : 'created_at',
    updatedAt : 'updated_at',
    deletedAt : 'deleted_at',
    paranoid  : true,
 })
class Title extends BaseModel<Title> {
    
    // ============================================================================================ Primary Key
    @Column({ primaryKey: true, type: DataType.UUID,defaultValue: DataType.UUIDV4})                 declare id: string;

    // ============================================================================================ Fields
    @Column({ allowNull: false, type: DataType.STRING(100) })                                       declare name_kh: string;
    @Column({ allowNull: false, type: DataType.STRING(100) })                                       declare name_en: string;

    // ===========================================================================================>> One to Many
}

export default Title;
