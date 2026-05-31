import { CertificateLevel, PrismaClient, QuestionType } from '@prisma/client';

export async function seedLms(prisma: PrismaClient) {
  const tracks = [
    { slug: 'scratch-explorer', title: 'Scratch Explorer', sortOrder: 1 },
    { slug: 'robotics-maker', title: 'Robotics Maker', sortOrder: 2 },
    { slug: 'iot-developer', title: 'IoT Developer', sortOrder: 3 },
    { slug: 'ai-builder', title: 'AI Builder', sortOrder: 4 },
    { slug: 'robotics-engineer', title: 'Robotics Engineer', sortOrder: 5 },
    { slug: 'automation-engineer', title: 'Automation Engineer', sortOrder: 6 },
  ];

  for (const t of tracks) {
    await prisma.learningTrack.upsert({
      where: { slug: t.slug },
      update: { title: t.title, sortOrder: t.sortOrder },
      create: {
        slug: t.slug,
        title: t.title,
        description: `STEMVerse learning track: ${t.title}`,
        sortOrder: t.sortOrder,
      },
    });
  }

  const roboticsTrack = await prisma.learningTrack.findUnique({
    where: { slug: 'robotics-maker' },
  });

  const scratchCourse = await prisma.course.upsert({
    where: { slug: 'scratch-fundamentals' },
    update: {},
    create: {
      title: 'Scratch Fundamentals',
      slug: 'scratch-fundamentals',
      category: 'scratch',
      level: 'beginner',
      description: 'Learn block-based programming with Scratch Studio.',
      track: { connect: { slug: 'scratch-explorer' } },
    },
  });

  await prisma.module.deleteMany({ where: { courseId: scratchCourse.id } }).catch(() => undefined);

  const scratchMod = await prisma.module.create({
    data: {
      courseId: scratchCourse.id,
      title: 'Getting Started',
      sortOrder: 1,
      lessons: {
        create: [
          {
            title: 'Your First Sprite',
            contentMd: 'Create a sprite and make it move on the stage.',
            sortOrder: 1,
          },
          {
            title: 'Events and Motion',
            contentMd: 'Use event blocks to control when scripts run.',
            sortOrder: 2,
          },
        ],
      },
    },
    include: { lessons: true },
  });

  const roboticsCourse = await prisma.course.upsert({
    where: { slug: 'robotics-maker-intro' },
    update: {},
    create: {
      title: 'Robotics Maker: Blockly & Hardware',
      slug: 'robotics-maker-intro',
      category: 'robotics',
      level: 'beginner',
      description: 'Build robots with Blockly, ESP32, and the STEMVerse Robotics Studio.',
      trackId: roboticsTrack?.id,
    },
  });

  const mod1 = await prisma.module.upsert({
    where: { id: '00000000-0000-4000-8000-000000000101' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000101',
      courseId: roboticsCourse.id,
      title: 'Introduction to Robotics',
      sortOrder: 1,
    },
  });

  const lesson1 = await prisma.lesson.upsert({
    where: { id: '00000000-0000-4000-8000-000000000201' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000201',
      moduleId: mod1.id,
      title: 'LED Blink with Blockly',
      contentMd:
        'Use the Robotics Studio to build an LED blink program. Try the AI Assistant to generate blocks from natural language.',
      sortOrder: 1,
    },
  });

  await prisma.lessonProject.upsert({
    where: { id: '00000000-0000-4000-8000-000000000301' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000301',
      lessonId: lesson1.id,
      title: 'Blink Challenge',
      description: 'Create a project that blinks an LED every second.',
      templateKey: 'led_blink',
      boardType: 'arduino_uno',
      sortOrder: 1,
    },
  });

  const assessment = await prisma.assessment.upsert({
    where: { id: '00000000-0000-4000-8000-000000000401' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000401',
      lessonId: lesson1.id,
      title: 'LED & GPIO Quiz',
      passingScore: 70,
    },
  });

  await prisma.assessmentQuestion.deleteMany({ where: { assessmentId: assessment.id } });
  await prisma.assessmentQuestion.createMany({
    data: [
      {
        assessmentId: assessment.id,
        type: QuestionType.MULTIPLE_CHOICE,
        prompt: 'Which pin mode is used for an LED output?',
        options: ['INPUT', 'OUTPUT', 'ANALOG', 'PWM'],
        correctAnswer: 'OUTPUT',
        points: 1,
        sortOrder: 0,
      },
      {
        assessmentId: assessment.id,
        type: QuestionType.TRUE_FALSE,
        prompt: 'digitalWrite can set a pin HIGH or LOW.',
        correctAnswer: 'true',
        points: 1,
        sortOrder: 1,
      },
      {
        assessmentId: assessment.id,
        type: QuestionType.MULTIPLE_SELECT,
        prompt: 'Select valid STEMVerse robotics targets:',
        options: ['Arduino C++', 'ESP-IDF', 'MicroPython', 'ROS2 full stack'],
        correctAnswer: ['Arduino C++', 'ESP-IDF', 'MicroPython'],
        points: 2,
        sortOrder: 2,
      },
    ],
  });

  void scratchMod;
  return { tracks: tracks.length, roboticsCourse: roboticsCourse.slug };
}
