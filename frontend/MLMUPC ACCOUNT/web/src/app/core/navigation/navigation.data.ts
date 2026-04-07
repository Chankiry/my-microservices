import { HelperNavigationItem } from 'helper/components/navigation';

const adminNavigation: HelperNavigationItem[] = [
    {
        id: 'home',
        type: 'basic',
        icon: 'mdi:home-outline',
        link: '/admin/home',
    },
    {
        id  : 'accounts',
        type: 'basic',
        icon: 'mdi:shield-account',
        link: '/admin/accounts',
    },
    {
        id  : 'systems',
        type: 'basic',
        icon: 'mdi:monitor',
        link: '/admin/systems',
    },
    {
        id  : 'new-knowledge',
        type: 'basic',
        icon: 'mdi:lightbulb',
        link: '/admin/new-knowledge',
    },
    {
        id  : 'security',
        type: 'basic',
        icon: 'mdi:shield-lock',
        link: '/admin/security',
    },
    {
        id  : 'settings',
        type: 'basic',
        icon: 'mdi:cog',
        link: '/admin/settings',
    },
];

export const navigationData = {
    admin: adminNavigation
};
