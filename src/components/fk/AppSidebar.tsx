import { useLocation, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Lock, LogOut, Palette, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { useAdminAccess } from "@/components/fk/access/AdminAccess";
import { NavAnchor } from "@/components/fk/NavAnchor";
import { PegadaianLogo } from "@/components/fk/Logo";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { auth } from "@/lib/formkanwil/auth";
import { useForms, useResponses } from "@/lib/formkanwil/hooks";
import {
  buildAdminNavigation,
  isNavActive,
  type NavItem,
  type NavLeaf,
} from "@/lib/formkanwil/navigation";
import { cn } from "@/lib/utils";

export function initialsOf(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function FeedDot({ slot }: { slot: 1 | 2 }) {
  return (
    <span className="pill bg-lime text-primary-deep" title={`Feed Daily Report ${slot}`}>
      Feed {slot}
    </span>
  );
}

function ActiveBar() {
  return (
    <span
      aria-hidden
      className="absolute -left-2 top-1 bottom-1 w-1 rounded-r-full bg-primary transition-all"
    />
  );
}

function ItemIcon({ item }: { item: NavItem }) {
  if (item.icon) {
    const Icon = item.icon;
    return <Icon />;
  }
  return (
    <span aria-hidden className="grid size-4 shrink-0 place-items-center text-sm leading-none">
      {item.emoji ?? "📝"}
    </span>
  );
}

function Flyout({ item, pathname }: { item: NavItem; pathname: string }) {
  return (
    <HoverCardContent side="right" align="start" sideOffset={14} className="w-60 rounded-2xl p-2">
      <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
        <span className="truncate text-sm font-bold text-foreground">{item.label}</span>
        {item.feedingSlot ? <FeedDot slot={item.feedingSlot} /> : null}
      </div>
      <div className="flex flex-col gap-0.5">
        {item.children?.map((child) => {
          const active = isNavActive(pathname, child);
          const Icon = child.icon;
          return (
            <NavAnchor
              key={child.id}
              nav={child.link}
              data-active={active}
              className="flex h-9 items-center gap-2 rounded-xl px-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
            >
              {Icon ? <Icon className="size-4 text-primary" /> : null}
              <span className="flex-1 truncate">{child.label}</span>
              {child.badge !== undefined ? (
                <span className="pill bg-muted text-muted-foreground">{child.badge}</span>
              ) : null}
            </NavAnchor>
          );
        })}
      </div>
    </HoverCardContent>
  );
}

const menuButtonClass =
  "h-10 rounded-xl px-3 font-medium text-sidebar-foreground data-[active=true]:font-semibold group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-3";

function NavEntry({ item, pathname }: { item: NavItem; pathname: string }) {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const active = isNavActive(pathname, item);
  const collapsed = state === "collapsed" && !isMobile;
  const close = () => isMobile && setOpenMobile(false);

  if (!item.children?.length) {
    return (
      <SidebarMenuItem className="relative">
        {active && <ActiveBar />}
        <SidebarMenuButton asChild isActive={active} tooltip={item.label} className={menuButtonClass}>
          <NavAnchor nav={item.link} onClick={close}>
            <ItemIcon item={item} />
            <span>{item.label}</span>
          </NavAnchor>
        </SidebarMenuButton>
        {item.badge !== undefined && (
          <SidebarMenuBadge className="top-2.5 rounded-full bg-mint-soft px-2 text-[0.6875rem] font-bold tabular-nums text-mint-foreground">
            {item.badge}
          </SidebarMenuBadge>
        )}
      </SidebarMenuItem>
    );
  }

  if (collapsed) {
    return (
      <SidebarMenuItem className="relative">
        {active && <ActiveBar />}
        <HoverCard openDelay={60} closeDelay={120}>
          <HoverCardTrigger asChild>
            <SidebarMenuButton asChild isActive={active} className={menuButtonClass}>
              <NavAnchor nav={item.link} aria-label={item.label}>
                <ItemIcon item={item} />
                <span>{item.label}</span>
              </NavAnchor>
            </SidebarMenuButton>
          </HoverCardTrigger>
          <Flyout item={item} pathname={pathname} />
        </HoverCard>
        {item.feedingSlot ? (
          <span
            aria-hidden
            className="absolute right-0.5 top-0.5 size-2.5 rounded-full border-2 border-sidebar bg-primary-glow"
          />
        ) : null}
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible asChild defaultOpen={active} className="group/collapsible">
      <SidebarMenuItem className="relative">
        {active && <ActiveBar />}
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={active} className={menuButtonClass}>
            <ItemIcon item={item} />
            <span className="flex-1 truncate">{item.label}</span>
            {item.feedingSlot ? <FeedDot slot={item.feedingSlot} /> : null}
            <ChevronRight className="ml-auto !size-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
          <SidebarMenuSub className="mr-0 mt-0.5 gap-0.5 pr-0">
            {item.children.map((child: NavLeaf) => {
              const childActive = isNavActive(pathname, child);
              return (
                <SidebarMenuSubItem key={child.id}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={childActive}
                    className="h-8 rounded-lg data-[active=true]:font-semibold"
                  >
                    <NavAnchor nav={child.link} onClick={close}>
                      <span className="flex-1 truncate">{child.label}</span>
                      {child.badge !== undefined ? (
                        <span className="pill bg-muted text-muted-foreground">{child.badge}</span>
                      ) : null}
                    </NavAnchor>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function AppSidebar() {
  const { pathname } = useLocation();
  const forms = useForms();
  const responses = useResponses();
  const { user, isAdmin, openLogin } = useAdminAccess();
  const navigate = useNavigate();
  const groups = buildAdminNavigation(forms, responses, { isAdmin });

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="px-3 pb-2 pt-4 group-data-[collapsible=icon]:px-2">
        <NavAnchor
          nav={{ to: "/admin" }}
          className="flex items-center gap-3 rounded-xl p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-brand font-display text-sm font-extrabold text-primary-foreground shadow-brand">
            FK
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block font-display text-base font-extrabold leading-tight tracking-tight text-foreground">
              FormKanwil
            </span>
            <span className="block truncate text-xs text-muted-foreground">Kanwil Manado</span>
          </span>
          <PegadaianLogo className="ml-auto h-6 group-data-[collapsible=icon]:hidden" />
        </NavAnchor>
      </SidebarHeader>

      <SidebarContent className="gap-1 px-1">
        {groups.map((group) =>
          group.items.length === 0 && group.id !== "active-forms" ? null : (
            <SidebarGroup key={group.id}>
              <SidebarGroupLabel className="eyebrow px-3 text-[0.625rem]">
                {group.label}
              </SidebarGroupLabel>
              <SidebarMenu className="gap-0.5">
                {group.items.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                    Belum ada form aktif.
                  </li>
                ) : (
                  group.items.map((item) => (
                    <NavEntry key={item.id} item={item} pathname={pathname} />
                  ))
                )}
              </SidebarMenu>
            </SidebarGroup>
          ),
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        {!user && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={openLogin}
                tooltip="Login Admin"
                className="h-11 rounded-xl border border-primary/30 bg-card px-3 font-semibold text-primary hover:bg-mint-soft group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-3"
              >
                <Lock />
                <span>Login Admin</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="h-12 rounded-xl px-2 group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-0"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-mint-soft text-xs font-bold text-mint-foreground">
                  {initialsOf(user.name)}
                </span>
                <span className="min-w-0 flex-1 text-left leading-tight">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {user.name}
                  </span>
                  <span className="block truncate text-xs font-semibold text-primary">Admin Mode</span>
                </span>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-56 rounded-xl">
              <DropdownMenuLabel className="font-normal">
                <div className="text-sm font-semibold">{user.name}</div>
                <div className="text-xs text-muted-foreground">Administrator · @{user.username}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate({ to: "/admin/users" })}>
                <ShieldCheck /> Akun & Akses
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate({ to: "/admin/settings/theme" })}>
                <Palette /> Tema & Branding
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className={cn("text-destructive-foreground focus:bg-destructive-soft")}
                onSelect={async () => {
                  await auth.signOut();
                  toast.info("Kamu keluar dari Admin Mode", { description: "Dashboard tetap bisa dilihat." });
                  navigate({ to: "/admin", replace: true });
                }}
              >
                <LogOut /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
