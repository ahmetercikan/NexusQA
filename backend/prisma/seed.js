import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Önce tüm eski agentları sil ve yenilerini oluştur
  await prisma.agent.deleteMany({});

  // Create default agents
  const agents = await Promise.all([
    prisma.agent.create({
      data: {
        name: 'Analist Agent',
        role: 'Analist (Dokümantasyon)',
        type: 'ANALYST',
        status: 'IDLE',
        efficiency: 96.8,
        totalCost: 0,
        icon: 'FileSearch'
      }
    }),
    prisma.agent.create({
      data: {
        name: 'Test Mimari',
        role: 'Kidemli Test Mimari',
        type: 'TEST_ARCHITECT',
        status: 'IDLE',
        efficiency: 98.5,
        totalCost: 0,
        icon: 'Bug'
      }
    }),
    prisma.agent.create({
      data: {
        name: 'Proje Yöneticisi',
        role: 'Proje Yöneticisi',
        type: 'ORCHESTRATOR',
        status: 'IDLE',
        efficiency: 100,
        totalCost: 0,
        icon: 'GitBranch'
      }
    }),
    prisma.agent.create({
      data: {
        name: 'Guvenlik Analisti',
        role: 'Siber Guvenlik Uzmani',
        type: 'SECURITY_ANALYST',
        status: 'IDLE',
        efficiency: 99.1,
        totalCost: 0,
        icon: 'ShieldAlert'
      }
    }),
    prisma.agent.create({
      data: {
        name: 'Rapor Analisti',
        role: 'Test Raporlama Uzmanı',
        type: 'REPORT_ANALYST',
        status: 'IDLE',
        efficiency: 97.5,
        totalCost: 0,
        icon: 'BarChart3'
      }
    })
  ]);

  console.log('Created agents:', agents.map(a => a.name));

  // Create a sample project
  const project = await prisma.project.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Nexus QA Projesi',
      description: 'AI Powered Automation',
      baseUrl: 'https://ahmetmesutercikan.com',
      isActive: true
    }
  });

  console.log('Created project:', project.name);

  // Create sample test suites
  const uiSuite = await prisma.testSuite.upsert({
    where: { id: 1 },
    update: {},
    create: {
      projectId: project.id,
      name: 'Login Modulu Testleri',
      description: 'Kullanici giris islemleri test senaryolari',
      type: 'UI',
      isActive: true
    }
  });

  const apiSuite = await prisma.testSuite.upsert({
    where: { id: 2 },
    update: {},
    create: {
      projectId: project.id,
      name: 'API Endpoint Testleri',
      description: 'REST API endpoint dogrulama testleri',
      type: 'API',
      isActive: true
    }
  });

  console.log('Created test suites:', [uiSuite.name, apiSuite.name]);

  // Create sample test cases
  const testCases = await Promise.all([
    prisma.testCase.upsert({
      where: { id: 1 },
      update: {},
      create: {
        suiteId: uiSuite.id,
        name: 'Basarili Login Testi',
        description: 'Gecerli kullanici bilgileri ile giris yapilabilmeli',
        steps: [
          { step: 1, action: 'Login sayfasina git', selector: '/login' },
          { step: 2, action: 'Email gir', selector: '#email', value: 'test@example.com' },
          { step: 3, action: 'Sifre gir', selector: '#password', value: '********' },
          { step: 4, action: 'Giris butonuna tikla', selector: '#login-btn' },
          { step: 5, action: 'Dashboard sayfasini dogrula', selector: '.dashboard' }
        ],
        expectedResult: 'Kullanici basariyla giris yapmali ve dashboard sayfasina yonlendirilmeli',
        priority: 'HIGH',
        status: 'ACTIVE'
      }
    }),
    prisma.testCase.upsert({
      where: { id: 2 },
      update: {},
      create: {
        suiteId: uiSuite.id,
        name: 'Hatali Login Testi',
        description: 'Yanlis sifre ile giris engellenmeli',
        steps: [
          { step: 1, action: 'Login sayfasina git', selector: '/login' },
          { step: 2, action: 'Email gir', selector: '#email', value: 'test@example.com' },
          { step: 3, action: 'Yanlis sifre gir', selector: '#password', value: 'wrongpass' },
          { step: 4, action: 'Giris butonuna tikla', selector: '#login-btn' },
          { step: 5, action: 'Hata mesajini dogrula', selector: '.error-message' }
        ],
        expectedResult: 'Hata mesaji gosterilmeli: "Gecersiz kullanici bilgileri"',
        priority: 'HIGH',
        status: 'ACTIVE'
      }
    }),
    prisma.testCase.upsert({
      where: { id: 3 },
      update: {},
      create: {
        suiteId: apiSuite.id,
        name: 'GET /api/products Testi',
        description: 'Urun listesi endpoint testi',
        steps: [
          { step: 1, action: 'GET istegi gonder', endpoint: '/api/products' },
          { step: 2, action: 'Status code kontrol', expected: 200 },
          { step: 3, action: 'Response format kontrol', expected: 'array' }
        ],
        expectedResult: 'Status 200, urun listesi JSON array olarak donmeli',
        priority: 'MEDIUM',
        status: 'ACTIVE'
      }
    })
  ]);

  console.log('Created test cases:', testCases.map(tc => tc.name));

  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
