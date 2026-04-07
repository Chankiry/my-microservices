import { PLTRoleIdEnum, RealmRoleIdEnum, SystemEnum, UserSystemAccessAccountTypeEnum, UserSystemAccessRegistrationStatusEnum } from "@app/shared/enums/System.enum";
import UserSystemAccess from "@models/user/user-system-access.model";
import UserSystemRole from "@models/user/user-system-role.model";
import User from "@models/user/user.model";

export class UserSeeder {
    public static seed = async () => {
        try {
            await UserSeeder.seedUser();
            await UserSeeder.seedUserSystemAccess();
            await UserSeeder.seedUserSystemRole();
        } catch (error) {
            console.error("\x1b[31m\nError seeding data user:", error);
        }
    };

    private static async seedUser() {
        try {
            await User.bulkCreate(data.users);
            console.log("\x1b[32mUser data inserted successfully.");
        } catch (error) {
            console.error("Error seeding user:", error);
            throw error;
        }
    }

    private static async seedUserSystemAccess() {
        try {
            await UserSystemAccess.bulkCreate(data.user_system_accesses);
            console.log("\x1b[32mUserSystemAccess data inserted successfully.");
        } catch (error) {
            console.error("Error seeding user system access:", error);
            throw error;
        }
    }

    private static async seedUserSystemRole() {
        try {
            await UserSystemRole.bulkCreate(data.user_system_roles);
            console.log("\x1b[32mUserSystemRole data inserted successfully.");
        } catch (error) {
            console.error("Error seeding user system role:", error);
            throw error;
        }
    }

}

const ids = {
    user1: '153c11f0-47fb-4ba0-b225-75852e6bf9a6',
    user2: '2e7bd4b4-3231-4a07-8c7c-96baffe09d0d',
    user3: '493c5043-a649-4c89-84f5-05d6eec7cc08',
    user4: '5adf2c16-d654-41c7-bb26-21fd15ce78cc',
    user5: '5ae9510b-cf7b-4663-8789-ecebf7c9aa37',
    user6: '708a57f9-6323-4c00-a517-6747c2ba1953',
    user7: 'a93cacf2-c0f7-4f04-9693-443dcfe3ec69',

    user_keycloak_id1: '25377ecf-a208-490f-9f4c-d198f8a5561b',
    user_keycloak_id2: 'cb3d681b-3b44-4199-a6c9-066d795deff3',
    user_keycloak_id3: '17793fe9-251b-4053-8bee-a0552121de8d',
    user_keycloak_id4: 'c00fe8d7-ee29-4762-8e47-d9abe9170e82',
    user_keycloak_id5: '2729d69d-82a0-4c4d-b3d2-1da1b03a15e8',
    user_keycloak_id6: '8ee4244c-8dda-42ef-83c6-532c408643af',
    user_keycloak_id7: '153668d0-76a2-4f9f-9b29-d0a0c639cefe',
}

const data = {
    users: [
        {
            id: ids.user1,
            phone: '095596855',
            email: 'user@gmail.com',
            first_name: 'user',
            last_name: 'user',
            keycloak_id: ids.user_keycloak_id1,
            is_active: true,
            email_verified: true,
        },
        {
            id: ids.user2,
            phone: '089808991',
            email: 'kaksoky@gmail.com',
            first_name: 'Kak',
            last_name: 'Soky',
            keycloak_id: ids.user_keycloak_id2,
            is_active: true,
            email_verified: true,
        },
        {
            id: ids.user3,
            phone: '095596850',
            email: 'admin@gmail.com',
            first_name: 'admin123',
            last_name: 'admin',
            keycloak_id: ids.user_keycloak_id3,
            is_active: true,
            email_verified: true,
        },
        {
            id: ids.user4,
            phone: '095596870',  
            first_name: 'kiry',
            last_name: 'kong',            
            keycloak_id: ids.user_keycloak_id4,
            is_active: true,            
            email_verified: true,
        },
        {
            id: ids.user5,
            phone: '087600063',
            email: 'lengsokchhay@gmail.com',            
            first_name: 'Leng',
            last_name: 'Sokchhay',            
            keycloak_id: ids.user_keycloak_id5,
            is_active: true,            
            email_verified: true,
        },
        {
            id: ids.user6,
            phone: '017888883',
            email: 'kithchankrisna@gmail.com',            
            first_name: 'Kith',
            last_name: 'Chankrisna',            
            keycloak_id: ids.user_keycloak_id6,
            is_active: true,            
            email_verified: true,
        },
        {
            id: ids.user7,
            phone: '0889566929',
            email: 'chansuvannet999@gmail.com',            
            first_name: 'Chan',
            last_name: 'Suvannet',            
            keycloak_id: ids.user_keycloak_id7,
            is_active: true,            
            email_verified: true,
        },
    ],

    user_system_roles: [
        {
            user_id: ids.user3,
            system_id: SystemEnum.ACCOUNT_SYSTEM,
            role_id: RealmRoleIdEnum.USER,
            granted_by: ids.user3,
            granted_at: new Date(),
            creator_id: ids.user3,
        },
        {
            user_id: ids.user1,
            system_id: SystemEnum.ACCOUNT_SYSTEM,
            role_id: RealmRoleIdEnum.USER,
            granted_by: ids.user1,
            granted_at: new Date(),
            creator_id: ids.user1,
        },
        {
            user_id: ids.user5,
            system_id: SystemEnum.ACCOUNT_SYSTEM,
            role_id: RealmRoleIdEnum.ADMIN,
        },
        {
            user_id: ids.user2,
            system_id: SystemEnum.ACCOUNT_SYSTEM,
            role_id: RealmRoleIdEnum.USER,
        },
        {
            user_id: ids.user3,
            system_id: SystemEnum.ACCOUNT_SYSTEM,
            role_id: RealmRoleIdEnum.ADMIN,
        },
        {
            user_id: ids.user4,
            system_id: SystemEnum.ACCOUNT_SYSTEM,
            role_id: RealmRoleIdEnum.USER,
        },
        {
            user_id: ids.user5,
            system_id: SystemEnum.ACCOUNT_SYSTEM,
            role_id: RealmRoleIdEnum.USER,
        },
        {
            user_id: ids.user5,
            system_id: SystemEnum.PLT,
            role_id: PLTRoleIdEnum.ADMIN,
        },
        {
            user_id: ids.user6,
            system_id: SystemEnum.ACCOUNT_SYSTEM,
            role_id: RealmRoleIdEnum.USER,
        },
        {
            user_id: ids.user5,
            system_id: SystemEnum.PLT,
            role_id: PLTRoleIdEnum.USER,
        },
        {
            user_id: ids.user7,
            system_id: SystemEnum.ACCOUNT_SYSTEM,
            role_id: RealmRoleIdEnum.USER,
        },
    ],

    user_system_accesses: [
        {
            user_id: ids.user6,
            system_id: SystemEnum.PLT,
            granted_by: ids.user3,
            granted_at: new Date(),
            account_type: UserSystemAccessAccountTypeEnum.MANAGED,
            registration_status: UserSystemAccessRegistrationStatusEnum.ACTIVE,
        },
        {
            user_id: ids.user5,
            system_id: SystemEnum.PLT,
            granted_by: ids.user3,
            granted_at: new Date(),
            account_type: UserSystemAccessAccountTypeEnum.MANAGED,
            registration_status: UserSystemAccessRegistrationStatusEnum.ACTIVE,
        },
        {
            user_id: ids.user7,
            system_id: SystemEnum.PLT,
            granted_by: ids.user3,
            granted_at: new Date(),
            account_type: UserSystemAccessAccountTypeEnum.MANAGED,
            registration_status: UserSystemAccessRegistrationStatusEnum.ACTIVE,
        },
        {
            user_id: ids.user2,
            system_id: SystemEnum.PLT,
            granted_by: ids.user3,
            granted_at: new Date(),
            account_type: UserSystemAccessAccountTypeEnum.MANAGED,
            registration_status: UserSystemAccessRegistrationStatusEnum.ACTIVE,
        },
        {
            user_id: ids.user5,
            system_id: SystemEnum.PLT,
            granted_by: ids.user3,
            granted_at: new Date(),
            account_type: UserSystemAccessAccountTypeEnum.MANAGED,
            registration_status: UserSystemAccessRegistrationStatusEnum.ACTIVE,
        },
    ],

};
