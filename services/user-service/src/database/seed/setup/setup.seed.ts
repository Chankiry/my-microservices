import { SexEnum } from "@app/shared/enums/sex.enum";
import { PLTRoleIdEnum, RealmRoleIdEnum, SystemEnum, SystemRoleTypeEnum } from "@app/shared/enums/System.enum";
import SystemRole from "@models/system/system-role.model";
import System from "@models/system/system.model";
import Sex from "@models/user/sex.model";

export class SetupSeeder {
    public static seed = async () => {
        try {
            await SetupSeeder.seedSex();
            await SetupSeeder.seedSystems();
            await SetupSeeder.seedRoles();
        } catch (error) {
            console.error("\x1b[31m\nError seeding data setup:", error);
        }
    };

    private static async seedSex() {
        try {
            await Sex.bulkCreate(data.sexes);
            console.log("\x1b[32mSex data inserted successfully.");
        } catch (error) {
            console.error("Error seeding sex:", error);
            throw error;
        }
    }

    private static async seedSystems() {
        try {
            await System.bulkCreate(data.systems);
            console.log("\x1b[32mSystems data inserted successfully.");
        } catch (error) {
            console.error("Error seeding systems:", error);
            throw error;
        }
    }

    private static async seedRoles() {
        try {
            await SystemRole.bulkCreate(data.system_roles);
            console.log("\x1b[32mRoles data inserted successfully.");
        } catch (error) {
            console.error("Error seeding roles:", error);
            throw error;
        }
    }

}

const data = {
    sexes: [
        { 
            id: SexEnum.MALE,
            name_kh: "ប្រុស", 
            name_en: "Male" 
        },
        { 
            id: SexEnum.FEMALE,
            name_kh: "ស្រី", 
            name_en: "Female" 
        },
    ],
    systems: [
        { 
            id: SystemEnum.ACCOUNT_SYSTEM, 
            name_kh: 'គណនីឌីជីថល', 
            name_en: 'MLMUPC ACCOUNT SYSTEM',
            abbre: 'MAS',
            logo: 'images/icons/Account.png',
            cover: null,
            description_kh: 'ប្រព័ន្ធគណនីឌីជីថលសម្រាប់គ្រប់គ្រងអ្នកប្រើប្រាស់ និងការចូលប្រើប្រព័ន្ធផ្សេងៗរបស់ MLMUPC',
            description_en: 'A digital account system for managing users and access across MLMUPC systems',
            allow_self_register: true,
            require_approval: false,
            is_internal: true,
            is_active: true
        },
        { 
            id: SystemEnum.PLT, 
            name_kh: 'វិញ្ញាបនបត្រសំគាល់ម្ចាស់អចលនវត្ថុ', 
            name_en: 'Personal Land Title',
            abbre: 'PLT',
            logo: 'images/icons/PLT.png',
            cover: null,
            description_kh: '',
            description_en: 'PLT business system',
            allow_self_register: true,
            require_approval: false,
            is_internal: false,
            is_active: true,
            keycloak_client_id: 'plt',
            auth_callback_url: 'http://localhost:3005/api/auth/internal/validate',
            base_url: 'http://localhost:4444'
        },
    ],
    system_roles: [
        {
            id: RealmRoleIdEnum.ADMIN,
            system_id: 'mlmupc-account-system',
            name_kh: "អភិបាលប្រព័ន្ធ",
            name_en: "Admin",
            slug: "admin",
            icon: 'mdi:star-outline',
            color: '#1e40af',
            is_default: false,
            is_active: true,
            role_type: SystemRoleTypeEnum.REALM,
            keycloak_role_name: 'admin',
        },
        {
            id: RealmRoleIdEnum.USER,
            system_id: 'mlmupc-account-system',
            name_kh: "អ្នកប្រើប្រាស់",
            name_en: "User",
            slug: "user",
            icon: 'mdi:account-outline',
            color: '#64748b',
            is_default: true,
            is_active: true,
            role_type: SystemRoleTypeEnum.CLIENT,
            keycloak_role_name: 'user',
        },
        {
            id: PLTRoleIdEnum.ADMIN,
            system_id: 'plt',
            name_kh: "អភិបាលប្រព័ន្ធ",
            name_en: "Admin",
            slug: "admin",
            is_default: false,
            is_active: true,
            role_type: SystemRoleTypeEnum.CLIENT,
            keycloak_role_name: 'admin',
        },
        {
            id: PLTRoleIdEnum.USER,
            system_id: 'plt',
            name_kh: "អ្នកប្រើប្រាស់",
            name_en: "User",
            slug: "user",
            is_default: true,
            is_active: true,
            role_type: SystemRoleTypeEnum.CLIENT,
            keycloak_role_name: 'user',
        },
    ],
};
