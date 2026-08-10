'use client';

import React from 'react';

import {
  AppShell,
  Group,
  Burger,
  Button,
  Title,
  Menu,
  UnstyledButton,
  Text,
  Avatar,
  Container,
  Divider,
  Drawer,
  Stack,
  Box,
  ThemeIcon,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useAuthContext } from '@/context/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import {
  IconLogout,
  IconChevronDown,
  IconUser,
  IconLayoutDashboard,
  IconShield,
  IconBook,
  IconPhone,
  IconInfoCircle,
  IconHome,
  IconChevronRight,
  IconBooks,
} from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle, close }] = useDisclosure();
  const { logout } = useAuth();
  const { userEmail, role, isAuthenticated, isHydrated } = useAuthContext();
  const pathname = usePathname();

  const links = [
    { link: '/', label: 'Home', icon: IconHome },
    { link: '/courses', label: 'Courses', icon: IconBook },
    { link: '/about', label: 'About', icon: IconInfoCircle },
    { link: '/contact', label: 'Contact', icon: IconPhone },
  ];

  const desktopNavLinks = links.map((item) => {
    const isActive = pathname === item.link;
    return (
      <Link
        key={item.label}
        href={item.link}
        className={`desktop-nav-link ${isActive ? 'active' : ''}`}
      >
        <Group gap={6} wrap="nowrap" align="center">
          <item.icon size={16} className="nav-icon" />
          <span>{item.label}</span>
        </Group>
      </Link>
    );
  });

  const mobileNavLinks = links.map((item) => {
    const isActive = pathname === item.link;
    return (
      <Link
        key={item.label}
        href={item.link}
        onClick={close}
        className={`mobile-nav-link ${isActive ? 'active' : ''}`}
      >
        <Group justify="space-between" align="center" w="100%">
          <Group gap="md">
            <ThemeIcon
              size="md"
              radius="md"
              variant={isActive ? 'gradient' : 'light'}
              gradient={{ from: 'blue', to: 'violet' }}
              color={isActive ? undefined : 'gray'}
              style={{
                backgroundColor: isActive ? undefined : 'rgba(255, 255, 255, 0.06)',
                color: isActive ? 'white' : '#94a3b8',
              }}
            >
              <item.icon size={18} />
            </ThemeIcon>
            <Text fw={isActive ? 700 : 500} size="sm" style={{ color: isActive ? '#ffffff' : '#cbd5e1' }}>
              {item.label}
            </Text>
          </Group>
          <IconChevronRight size={16} style={{ opacity: isActive ? 1 : 0.4, color: isActive ? '#60a5fa' : '#94a3b8' }} />
        </Group>
      </Link>
    );
  });

  return (
    <AppShell
      header={{ height: 68 }}
      padding={0}
      styles={{
        main: {
          background: 'var(--mantine-color-body)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <AppShell.Header
        className="premium-header"
        style={{
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          zIndex: 100,
        }}
      >
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between" align="center" wrap="nowrap">
            {/* Brand Logo */}
            <Link href="/" style={{ textDecoration: 'none' }}>
              <Group gap="xs" align="center" wrap="nowrap">
                <ThemeIcon
                  size={36}
                  radius="md"
                  variant="gradient"
                  gradient={{ from: 'blue', to: 'violet' }}
                  style={{ boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
                >
                  <IconBooks size={20} color="white" />
                </ThemeIcon>
                <Title
                  order={3}
                  style={{
                    background: 'linear-gradient(135deg, #60a5fa 0%, #a855f7 50%, #ec4899 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontWeight: 900,
                    fontSize: '22px',
                    letterSpacing: '-0.5px',
                  }}
                >
                  EduVerse
                </Title>
              </Group>
            </Link>

            {/* Desktop Navigation Links */}
            <Group
              visibleFrom="sm"
              gap="xs"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '4px 8px',
                borderRadius: '100px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)',
              }}
            >
              {desktopNavLinks}
            </Group>

            {/* Desktop Auth Controls */}
            <Group visibleFrom="sm" gap="sm">
              {isHydrated && isAuthenticated ? (
                <Menu shadow="xl" width={230} position="bottom-end" transitionProps={{ transition: 'pop-top-right', duration: 150 }}>
                  <Menu.Target>
                    <UnstyledButton
                      style={{
                        padding: '4px 14px 4px 6px',
                        borderRadius: '100px',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      className="profile-pill"
                    >
                      <Group gap={8} wrap="nowrap" align="center">
                        <Box style={{ position: 'relative' }}>
                          <Avatar
                            src={null}
                            alt={userEmail || ''}
                            radius="xl"
                            size={30}
                            variant="gradient"
                            gradient={{ from: 'blue', to: 'violet' }}
                            fw={800}
                          >
                            {userEmail?.slice(0, 2).toUpperCase()}
                          </Avatar>
                          <span
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              right: 0,
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: '#22c55e',
                              boxShadow: '0 0 6px #22c55e',
                              border: '1.5px solid #0f172a',
                            }}
                          />
                        </Box>
                        <Stack gap={0} align="flex-start" style={{ display: 'flex', justifyContent: 'center' }}>
                          <Text size="9px" c="gray.4" style={{ lineHeight: 1, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                            লগইন করা আছে
                          </Text>
                          <Text size="xs" fw={700} lineClamp={1} style={{ maxWidth: '110px', lineHeight: 1.2, color: 'white' }}>
                            {userEmail}
                          </Text>
                        </Stack>
                        <IconChevronDown size={14} stroke={2} color="rgba(255, 255, 255, 0.7)" />
                      </Group>
                    </UnstyledButton>
                  </Menu.Target>

                  <Menu.Dropdown className="custom-menu-dropdown">
                    <Menu.Item
                      leftSection={<IconLayoutDashboard size={16} />}
                      component={Link}
                      href="/dashboard"
                      className="custom-menu-item"
                    >
                      ড্যাশবোর্ড
                    </Menu.Item>

                    {role === 'ADMIN' && (
                      <Menu.Item
                        leftSection={<IconShield size={16} />}
                        component={Link}
                        href="/admin"
                        className="custom-menu-item admin-item"
                      >
                        অ্যাডমিন প্যানেল
                      </Menu.Item>
                    )}

                    <Menu.Item
                      leftSection={<IconUser size={16} />}
                      component={Link}
                      href="/profile"
                      className="custom-menu-item"
                    >
                      আমার প্রোফাইল
                    </Menu.Item>

                    <Menu.Divider style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

                    <Menu.Item
                      color="red"
                      leftSection={<IconLogout size={16} />}
                      onClick={logout}
                      className="custom-menu-item logout-item"
                    >
                      সাইন আউট
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              ) : (
                <Group gap="xs">
                  <Button
                    variant="subtle"
                    component={Link}
                    href="/login"
                    radius="xl"
                    size="sm"
                    styles={{
                      root: {
                        color: 'rgba(241, 245, 249, 0.85)',
                        fontWeight: 600,
                        '&:hover': {
                          color: '#ffffff',
                          backgroundColor: 'rgba(255, 255, 255, 0.08) !important',
                        },
                      },
                    }}
                  >
                    সাইন ইন
                  </Button>
                  <Button
                    variant="gradient"
                    gradient={{ from: 'blue', to: 'violet' }}
                    component={Link}
                    href="/register"
                    radius="xl"
                    size="sm"
                    style={{
                      boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
                      fontWeight: 700,
                    }}
                  >
                    গেট স্টার্টেড
                  </Button>
                </Group>
              )}
            </Group>

            {/* Mobile Nav Toggle */}
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
              color="#f8fafc"
              aria-label="Toggle navigation"
            />
          </Group>
        </Container>
      </AppShell.Header>

      {/* Mobile Navigation Drawer */}
      <Drawer
        opened={opened}
        onClose={close}
        size="280px"
        padding="lg"
        position="right"
        title={
          <Group gap="xs" align="center">
            <ThemeIcon
              size={30}
              radius="md"
              variant="gradient"
              gradient={{ from: 'blue', to: 'violet' }}
            >
              <IconBooks size={16} color="white" />
            </ThemeIcon>
            <Text
              fw={900}
              size="lg"
              style={{
                background: 'linear-gradient(135deg, #60a5fa 0%, #a855f7 50%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              EduVerse
            </Text>
          </Group>
        }
        hiddenFrom="sm"
        styles={{
          content: {
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
          },
          header: {
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '16px 20px',
          },
          close: {
            color: '#f8fafc',
            borderRadius: '50%',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          },
          body: {
            padding: '20px',
          },
        }}
      >
        <Stack gap="xl" justify="space-between" h="calc(100vh - 100px)">
          <Stack gap="xs">
            {mobileNavLinks}
          </Stack>

          <Box>
            <Divider color="rgba(255, 255, 255, 0.1)" mb="lg" />
            {isHydrated && isAuthenticated ? (
              <Stack gap="md">
                <Group gap="sm" style={{ padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <Box style={{ position: 'relative' }}>
                    <Avatar
                      src={null}
                      alt={userEmail || ''}
                      radius="xl"
                      size={38}
                      variant="gradient"
                      gradient={{ from: 'blue', to: 'violet' }}
                      fw={800}
                    >
                      {userEmail?.slice(0, 2).toUpperCase()}
                    </Avatar>
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: '9px',
                        height: '9px',
                        borderRadius: '50%',
                        backgroundColor: '#22c55e',
                        boxShadow: '0 0 6px #22c55e',
                        border: '1.5px solid #0f172a',
                      }}
                    />
                  </Box>
                  <div style={{ overflow: 'hidden' }}>
                    <Text size="10px" c="gray.4" style={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>লগইন করা আছে</Text>
                    <Text size="xs" fw={700} style={{ color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</Text>
                  </div>
                </Group>

                <Stack gap="xs">
                  <Link href="/dashboard" onClick={close} className="mobile-nav-link">
                    <Group gap="sm" align="center">
                      <IconLayoutDashboard size={18} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                      <Text size="sm" fw={500} c="gray.3">
                        ড্যাশবোর্ড
                      </Text>
                    </Group>
                  </Link>

                  {role === 'ADMIN' && (
                    <Link href="/admin" onClick={close} className="mobile-nav-link">
                      <Group gap="sm" align="center">
                        <IconShield size={18} style={{ color: '#c084fc' }} />
                        <Text size="sm" fw={500} style={{ color: '#c084fc' }}>
                          অ্যাডমিন প্যানেল
                        </Text>
                      </Group>
                    </Link>
                  )}

                  <Link href="/profile" onClick={close} className="mobile-nav-link">
                    <Group gap="sm" align="center">
                      <IconUser size={18} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                      <Text size="sm" fw={500} c="gray.3">
                        আমার প্রোফাইল
                      </Text>
                    </Group>
                  </Link>

                  <UnstyledButton
                    onClick={() => {
                      close();
                      logout();
                    }}
                    className="mobile-nav-link"
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                    }}
                  >
                    <Group gap="sm" align="center">
                      <IconLogout size={18} style={{ color: '#f87171' }} />
                      <Text size="sm" fw={600} style={{ color: '#f87171' }}>
                        সাইন আউট
                      </Text>
                    </Group>
                  </UnstyledButton>
                </Stack>
              </Stack>
            ) : (
              <Stack gap="xs">
                <Link href="/login" onClick={close} className="mobile-nav-link">
                  <Group gap="sm" align="center">
                    <IconUser size={18} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                    <Text size="sm" fw={500} c="gray.3">
                      সাইন ইন
                    </Text>
                  </Group>
                </Link>

                <Link
                  href="/register"
                  onClick={close}
                  className="mobile-nav-link"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #a855f7 100%)',
                    border: 'none',
                    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
                  }}
                >
                  <Group gap="sm" align="center">
                    <IconBooks size={18} style={{ color: '#ffffff' }} />
                    <Text size="sm" fw={700} style={{ color: '#ffffff' }}>
                      গেট স্টার্টেড
                    </Text>
                  </Group>
                </Link>
              </Stack>
            )}
          </Box>
        </Stack>
      </Drawer>

      <AppShell.Main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* CSS rules for navigation links */}
        <style jsx global>{`
          .premium-header {
            background: rgba(15, 23, 42, 0.88) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
          }
          .desktop-nav-link {
            text-decoration: none;
            color: rgba(241, 245, 249, 0.75);
            font-size: 13.5px;
            font-weight: 600;
            padding: 6px 16px;
            border-radius: 100px;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            letter-spacing: 0.2px;
            display: inline-block;
            border: 1px solid transparent;
          }
          .desktop-nav-link:hover {
            background-color: rgba(255, 255, 255, 0.08);
            color: #ffffff;
          }
          .desktop-nav-link.active {
            color: #60a5fa;
            background-color: rgba(59, 130, 246, 0.15);
            border-color: rgba(59, 130, 246, 0.3);
            box-shadow: 0 0 12px rgba(59, 130, 246, 0.15);
          }
          .mobile-nav-link {
            text-decoration: none;
            display: block;
            padding: 12px 14px;
            border-radius: 12px;
            transition: all 0.2s ease;
            background-color: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
          }
          .mobile-nav-link:hover {
            background-color: rgba(255, 255, 255, 0.06);
            border-color: rgba(255, 255, 255, 0.1);
          }
          .mobile-nav-link.active {
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%);
            border-color: rgba(96, 165, 250, 0.3);
          }
          .nav-icon {
            color: rgba(241, 245, 249, 0.5);
            transition: color 0.2s ease;
          }
          .desktop-nav-link:hover .nav-icon {
            color: #ffffff;
          }
          .desktop-nav-link.active .nav-icon {
            color: #60a5fa;
          }
          .profile-pill:hover {
            background-color: rgba(255, 255, 255, 0.1) !important;
            border-color: rgba(255, 255, 255, 0.3) !important;
          }
          .custom-menu-dropdown {
            background-color: rgba(15, 23, 42, 0.95) !important;
            border: 1px solid rgba(255, 255, 255, 0.12) !important;
            backdrop-filter: blur(16px) !important;
            border-radius: 16px !important;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5) !important;
            padding: 8px !important;
          }
          .custom-menu-item {
            color: #cbd5e1 !important;
            font-size: 13.5px !important;
            font-weight: 600 !important;
            border-radius: 10px !important;
            padding: 8px 12px !important;
            transition: all 0.2s ease !important;
          }
          .custom-menu-item:hover {
            background-color: rgba(59, 130, 246, 0.15) !important;
            color: #ffffff !important;
          }
          .custom-menu-item.admin-item {
            color: #c084fc !important;
          }
          .custom-menu-item.admin-item:hover {
            background-color: rgba(168, 85, 247, 0.18) !important;
            color: #e9d5ff !important;
          }
          .custom-menu-item.logout-item {
            color: #f87171 !important;
          }
          .custom-menu-item.logout-item:hover {
            background-color: rgba(239, 68, 68, 0.15) !important;
            color: #fca5a5 !important;
          }
          .mobile-auth-btn {
            color: #cbd5e1 !important;
            background-color: rgba(255, 255, 255, 0.04) !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            justify-content: flex-start !important;
            font-weight: 600 !important;
            height: 44px !important;
          }
          .mobile-auth-btn:hover {
            background-color: rgba(59, 130, 246, 0.15) !important;
            color: #ffffff !important;
            border-color: rgba(59, 130, 246, 0.3) !important;
          }
          .mobile-auth-btn.admin {
            color: #c084fc !important;
          }
          .hero-background {
            background-color: #fafbfc;
            background-image: radial-gradient(rgba(12, 117, 235, 0.04) 1px, transparent 0), radial-gradient(rgba(115, 0, 230, 0.04) 1px, transparent 0);
            background-size: 24px 24px;
            background-position: 0 0, 12px 12px;
            padding-top: 100px;
            padding-bottom: 100px;
            border-bottom: 1px solid var(--mantine-color-gray-1);
            position: relative;
            overflow: hidden;
          }
          .glow-effect {
            position: absolute;
            width: 320px;
            height: 320px;
            background: radial-gradient(circle, rgba(28, 126, 214, 0.12) 0%, rgba(115, 0, 230, 0.04) 75%, transparent 100%);
            filter: blur(50px);
            top: 10%;
            right: 10%;
            z-index: 0;
            pointer-events: none;
          }
          .visual-card {
            box-shadow: 0 30px 60px rgba(28, 126, 214, 0.15) !important;
            transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
          }
          .visual-card:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 40px 80px rgba(115, 0, 230, 0.22) !important;
          }
          .premium-card {
            border: 1px solid var(--mantine-color-gray-2) !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02) !important;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
            background-color: white !important;
          }
          .premium-card:hover {
            transform: translateY(-6px);
            box-shadow: 0 20px 35px rgba(28, 126, 214, 0.08) !important;
            border-color: var(--mantine-color-blue-3) !important;
          }
        `}</style>
        
        {/* Child pages render here */}
        <div style={{ flexGrow: 1 }}>{children}</div>

        {/* Footer */}
        <footer style={{ backgroundColor: '#090d16', borderTop: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--mantine-color-gray-3)', paddingTop: '60px', paddingBottom: '30px', marginTop: 'auto' }}>
          <Container size="xl">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '40px', marginBottom: '40px' }}>
              <div>
                <Group gap="xs" mb="md" align="center">
                  <ThemeIcon
                    size={32}
                    radius="md"
                    variant="gradient"
                    gradient={{ from: 'blue', to: 'violet' }}
                  >
                    <IconBooks size={18} color="white" />
                  </ThemeIcon>
                  <Title
                    order={3}
                    style={{
                      background: 'linear-gradient(135deg, #60a5fa 0%, #a855f7 50%, #ec4899 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      fontWeight: 900,
                      fontSize: '22px',
                    }}
                  >
                    EduVerse
                  </Title>
                </Group>
                <Text size="sm" c="gray.5" mb="md" style={{ lineHeight: 1.7, maxWidth: '320px' }}>
                  বিসিএস প্রিলিমিনারি পরীক্ষার শতভাগ সিলেবাস কভারেজ ও নিয়মিত প্রিলি মডেল টেস্টের মাধ্যমে সেরা প্রস্তুতির জন্য একটি আধুনিক প্ল্যাটফর্ম।
                </Text>
              </div>

              <div>
                <Title order={4} c="white" mb="md" style={{ fontSize: '16px', fontWeight: 800 }}>
                  দ্রুত লিঙ্ক
                </Title>
                <Stack gap="sm">
                  <Text size="sm" component={Link} href="/" style={{ color: '#cbd5e1', textDecoration: 'none', transition: 'color 0.2s' }}>
                    হোম
                  </Text>
                  <Text size="sm" component={Link} href="/courses" style={{ color: '#cbd5e1', textDecoration: 'none', transition: 'color 0.2s' }}>
                    কোর্সসমূহ
                  </Text>
                  <Text size="sm" component={Link} href="/about" style={{ color: '#cbd5e1', textDecoration: 'none', transition: 'color 0.2s' }}>
                    আমাদের সম্পর্কে
                  </Text>
                  <Text size="sm" component={Link} href="/contact" style={{ color: '#cbd5e1', textDecoration: 'none', transition: 'color 0.2s' }}>
                    যোগাযোগ
                  </Text>
                </Stack>
              </div>

              <div>
                <Title order={4} c="white" mb="md" style={{ fontSize: '16px', fontWeight: 800 }}>
                  যোগাযোগের তথ্য
                </Title>
                <Stack gap="sm">
                  <Text size="sm" c="gray.4">📍 ঢাকা, বাংলাদেশ</Text>
                  <Text size="sm" c="gray.4">✉️ support@eduverse.com</Text>
                  <Text size="sm" c="gray.4">📞 +৮৮০ ১৭০০-০০০০০০</Text>
                </Stack>
              </div>
            </div>

            <Divider color="rgba(255, 255, 255, 0.1)" mb="xl" />

            <Group justify="space-between" align="center" styles={{ root: { flexWrap: 'wrap', gap: '15px' } }}>
              <Text size="xs" c="gray.5">
                © {new Date().getFullYear()} EduVerse। সর্বস্বত্ব সংরক্ষিত।
              </Text>
              <Group gap="md">
                <Text size="xs" c="gray.5" style={{ cursor: 'pointer' }}>গোপনীয়তা নীতি</Text>
                <Text size="xs" c="gray.5" style={{ cursor: 'pointer' }}>ব্যবহারের শর্তাবলি</Text>
              </Group>
            </Group>
          </Container>
        </footer>
      </AppShell.Main>
    </AppShell>
  );
}
