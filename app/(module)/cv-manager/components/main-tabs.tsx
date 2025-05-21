'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MainTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function MainTabs({ activeTab, onTabChange }: MainTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="upload">Gestionar CVs</TabsTrigger>
        <TabsTrigger value="chat" disabled>Chat (Próximamente)</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
