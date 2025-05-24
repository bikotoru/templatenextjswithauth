'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme-toggle';
import { OrganizationSwitcher } from '@/components/organization-switcher';
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
  Building2,
  LogOut,
  Menu,
  ChevronDown,
  Palette,
  User,
  UserCog,
  Settings,
  Cog,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  permission?: string;
  subItems?: MenuItem[];
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout, hasPermission, loading, currentOrganization } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const menuItems: MenuItem[] = [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: Home,
      permission: 'dashboard:view',
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
            <div className="flex items-center justify-center">
              {currentOrganization?.logo ? (
                <img 
                  src={currentOrganization.logo} 
                  alt={`Logo de ${currentOrganization.name}`}
                  className="h-8 max-w-full object-contain"
                  onError={(e) => {
                    // Fallback si la imagen no carga - mostrar nombre de la empresa
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const container = target.parentElement;
                    if (container) {
                      container.innerHTML = `<span class="font-semibold text-lg">${currentOrganization?.name || 'NextJS Template'}</span>`;
                    }
                  }}
                />
              ) : (
                <span className="font-semibold text-lg">
                  {currentOrganization?.name || 'NextJS Template'}
                </span>
              )}
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
          <header className="h-16 border-b bg-background flex items-center justify-between px-6 corporate-header">
            <div className="flex items-center space-x-4">
              <SidebarTrigger className="lg:hidden corporate-header-button">
                <Menu className="h-6 w-6" />
              </SidebarTrigger>
              <div>
                <h1 className="text-xl font-semibold">
                  {pathname === '/dashboard' && 'Dashboard'}
                  {pathname.startsWith('/admin/users') && 'Gestión de Usuarios'}
                  {pathname.startsWith('/admin/roles') && 'Gestión de Roles'}
                  {pathname.startsWith('/admin/permissions') && 'Gestión de Permisos'}
                  {pathname.startsWith('/admin/organizations') && 'Gestión de Organizaciones'}
                  {pathname.startsWith('/admin/theme') && 'Configuración de Tema'}
                  {pathname.startsWith('/admin/personalizacion') && 'Personalización'}
                  {pathname.startsWith('/admin/variables') && 'Variables del Sistema'}
                </h1>
                {currentOrganization && (
                  <p className="text-sm text-muted-foreground">
                    {currentOrganization.name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <OrganizationSwitcher />
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full corporate-header-button">
                    <Avatar className="h-8 w-8 corporate-user-avatar">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="user-fallback">{getInitials(user.name)}</AvatarFallback>
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
                      {currentOrganization && (
                        <p className="text-xs leading-none text-muted-foreground">
                          Org: {currentOrganization.name}
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* Opciones de usuario */}
                  <DropdownMenuItem asChild>
                    <Link href="/admin/users" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Mi Perfil</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  
                  {/* Personalización */}
                  <DropdownMenuLabel>Personalización</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/personalizacion" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Personalización</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {/* Administración */}
                  {(hasPermission('admin:access') || hasPermission('variables:manage') || hasPermission('users:view') || hasPermission('roles:view') || hasPermission('permissions:view') || hasPermission('organizations:view_all')) && (
                    <>
                      <DropdownMenuLabel>
                        <div className="flex items-center space-x-2">
                          <UserCog className="h-4 w-4" />
                          <span>Administración</span>
                        </div>
                      </DropdownMenuLabel>
                      
                      {hasPermission('variables:manage') && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin/variables" className="cursor-pointer">
                            <Cog className="mr-2 h-4 w-4" />
                            <span>Variables del Sistema</span>
                          </Link>
                        </DropdownMenuItem>
                      )}

                      {hasPermission('users:view') && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin/users" className="cursor-pointer">
                            <Users className="mr-2 h-4 w-4" />
                            <span>Usuarios</span>
                          </Link>
                        </DropdownMenuItem>
                      )}

                      {hasPermission('roles:view') && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin/roles" className="cursor-pointer">
                            <Shield className="mr-2 h-4 w-4" />
                            <span>Roles</span>
                          </Link>
                        </DropdownMenuItem>
                      )}

                      {hasPermission('permissions:view') && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin/permissions" className="cursor-pointer">
                            <Key className="mr-2 h-4 w-4" />
                            <span>Permisos</span>
                          </Link>
                        </DropdownMenuItem>
                      )}

                      {hasPermission('organizations:view_all') && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin/organizations" className="cursor-pointer">
                            <Building2 className="mr-2 h-4 w-4" />
                            <span>Organizaciones</span>
                          </Link>
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />
                    </>
                  )}

                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto bg-muted/30 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}