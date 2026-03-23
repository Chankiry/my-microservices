import {
    Table, Model, Column, DataType,
    CreatedAt, UpdatedAt, DeletedAt,
    ForeignKey,
} from 'sequelize-typescript';

@Table({
    tableName : 'users',
    createdAt : 'created_at',
    updatedAt : 'updated_at',
    deletedAt : 'deleted_at',
    paranoid  : true,
})
class User extends Model<User> {

    // ============================================================================================ Primary Key
    @Column({ primaryKey: true, type: DataType.UUID, defaultValue: DataType.UUIDV4 })               declare id: string;

    // ============================================================================================ Foreign Keys
    @ForeignKey(() => User) @Column({ type: DataType.UUID, allowNull: true })                       declare creator_id: string | null;
    @ForeignKey(() => User) @Column({ type: DataType.UUID, allowNull: true })                       declare updater_id: string | null;
    @ForeignKey(() => User) @Column({ type: DataType.UUID, allowNull: true })                       declare deleter_id: string | null;

    // ============================================================================================ Fields
    @Column({ type: DataType.STRING(30),  allowNull: false })                                       declare phone: string;
    @Column({ type: DataType.STRING(255), allowNull: true })                                        declare email: string | null;
    @Column({ type: DataType.STRING(100), allowNull: true })                                        declare first_name: string | null;
    @Column({ type: DataType.STRING(100), allowNull: true })                                        declare last_name: string | null;
    @Column({ type: DataType.STRING,      allowNull: true })                                        declare keycloak_id: string | null;
    @Column({ type: DataType.BOOLEAN,     defaultValue: true })                                     declare is_active: boolean;
    @Column({ type: DataType.BOOLEAN,     defaultValue: false })                                    declare email_verified: boolean;
    @Column({ type: DataType.STRING(500), allowNull: true })                                        declare avatar: string | null;
    @Column({ type: DataType.STRING(10),  allowNull: true })                                        declare gender: string | null;
    @Column({ type: DataType.DATE,        allowNull: true })                                        declare last_login_at: Date | null;

    @CreatedAt                                                                                      declare created_at: Date;
    @UpdatedAt                                                                                      declare updated_at: Date;
    @DeletedAt                                                                                      declare deleted_at: Date | null;

    get full_name(): string {
        return `${this.first_name || ''} ${this.last_name || ''}`.trim();
    }
}

export default User;