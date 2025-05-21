'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import {
  Home,
  Users,
  Shield,
  Key,
  Settings,
  LogOut,
  Menu,
  FileText,
  MessageSquare,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<any>;
  permission?: string;
  subItems?: MenuItem[];
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout, hasPermission, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems: MenuItem[] = [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: Home,
      permission: 'dashboard:view',
    },
    {
      title: 'CV Manager',
      url: '/cv-manager',
      icon: FileText,
      permission: 'cv:view',
    },
    {
      title: 'CV Chat',
      url: '/cv-chat',
      icon: MessageSquare,
      permission: 'cv:chat',
    },
    {
      title: 'Admin',
      url: '/admin',
      icon: Settings,
      permission: 'admin:access',
      subItems: [
        {
          title: 'Usuarios',
          url: '/admin/users',
          icon: Users,
          permission: 'users:view',
        },
        {
          title: 'Roles',
          url: '/admin/roles',
          icon: Shield,
          permission: 'roles:view',
        },
        {
          title: 'Permisos',
          url: '/admin/permissions',
          icon: Key,
          permission: 'permissions:view',
        },
      ],
    },
  ];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    await logout();
  };

  const isActive = (url: string) => {
    if (url === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(url);
  };

  const filteredMenuItems = menuItems.filter((item) => {
    if (item.permission && !hasPermission(item.permission)) {
      return false;
    }
    if (item.subItems) {
      item.subItems = item.subItems.filter((subItem) => 
        !subItem.permission || hasPermission(subItem.permission)
      );
    }
    return true;
  });

  useEffect(() => {
    if (!user && !loading) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Sidebar */}
        <Sidebar className="w-64 border-r">
          <SidebarHeader className="p-4 border-b">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">NT</span>
              </div>
              <span className="font-semibold text-lg">NextJS Template</span>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-4">
            <SidebarMenu className="space-y-2">
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  {item.subItems && item.subItems.length > 0 ? (
                    // Menú con sub-items
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                          className={`w-full justify-between ${
                            isActive(item.url) ? 'bg-blue-100 text-blue-700' : ''
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <item.icon className="h-5 w-5" />
                            <span>{item.title}</span>
                          </div>
                          <ChevronDown className="h-4 w-4" />
                        </SidebarMenuButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        {item.subItems.map((subItem) => (
                          <DropdownMenuItem key={subItem.url} asChild>
                            <Link href={subItem.url} className="flex items-center space-x-2">
                              <subItem.icon className="h-4 w-4" />
                              <span>{subItem.title}</span>
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    // Menú simple
                    <SidebarMenuButton asChild>
                      <Link
                        href={item.url}
                        className={`flex items-center space-x-3 w-full ${
                          isActive(item.url) ? 'bg-blue-100 text-blue-700' : ''
                        }`}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar */}
          <header className="h-16 border-b bg-white flex items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <SidebarTrigger className="lg:hidden">
                <Menu className="h-6 w-6" />
              </SidebarTrigger>
              <h1 className="text-xl font-semibold">
                {pathname === '/dashboard' && 'Dashboard'}
                {pathname.startsWith('/admin/users') && 'Gestión de Usuarios'}
                {pathname.startsWith('/admin/roles') && 'Gestión de Roles'}
                {pathname.startsWith('/admin/permissions') && 'Gestión de Permisos'}
                {pathname.startsWith('/cv-manager') && 'CV Manager'}
                {pathname.startsWith('/cv-chat') && 'CV Chat'}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        Roles: {user.roles.join(', ')}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto bg-gray-50 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}