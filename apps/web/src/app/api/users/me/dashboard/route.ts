import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/users/me/dashboard
 * Dev-mode dashboard handler — returns mock data with sample projects.
 * 
 * Expected shape by DashboardPage:
 *   data.user.displayName, data.user.email
 *   data.stats.projectCount, data.stats.certificateCount
 *   data.recentProjects[].id, .name, .type, .updatedAt
 *   data.continueLearning[].id, .title, .level, .category
 *   data.certifications[].id, .course.title
 */
export async function GET(_req: NextRequest) {
  return NextResponse.json({
    user: {
      id: 'dev-user-1',
      email: 'dev@stemverse.io',
      displayName: 'Dev User',
      role: 'STUDENT',
    },
    recentProjects: [
      {
        id: 'd2e0b277-5f73-42bf-b960-5c3422d207a8',
        name: 'LED Blink Demo',
        type: 'ROBOTICS',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: 'Smart Home Project',
        type: 'ROBOTICS',
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'f9e8d7c6-b5a4-3210-fedc-ba9876543210',
        name: 'Distance Alarm',
        type: 'ROBOTICS',
        updatedAt: new Date(Date.now() - 172800000).toISOString(),
      },
    ],
    continueLearning: [
      {
        id: 'course-1',
        title: 'Getting Started with Arduino',
        slug: 'getting-started-arduino',
        category: 'Robotics',
        level: 'Beginner',
      },
      {
        id: 'course-2',
        title: 'ESP32 IoT Projects',
        slug: 'esp32-iot-projects',
        category: 'IoT',
        level: 'Intermediate',
      },
    ],
    certifications: [],
    stats: {
      projectCount: 3,
      certificateCount: 0,
    },
  });
}
