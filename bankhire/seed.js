require('dotenv').config();
const { sequelize } = require('./src/config/database');
const User = require('./src/models/User');
const Job = require('./src/models/Job');
const Application = require('./src/models/Application');
const Referral = require('./src/models/Referral');
const Earning = require('./src/models/Earning');

async function seedDatabase() {
  try {
    await sequelize.sync({ force: true }); // Reset database

    // Create comprehensive users with different profiles
    const users = [
      {
        mobile: '9999999999',
        role: 'ADMIN',
        location: 'Mumbai',
      },
      {
        mobile: '8888888888',
        role: 'MANAGER',
        location: 'Delhi',
      },
      {
        mobile: '7777000001',
        role: 'EMPLOYEE',
        location: 'Bengaluru',
      },
      {
        mobile: '8593986894',
        role: 'CANDIDATE',
        resumeUploaded: true,
        resumeFileReference: 'uploads/resume_candidate1.pdf',
        jobRole: 'Bank Manager',
        location: 'Bangalore',
      },
      {
        mobile: '7777777777',
        role: 'CANDIDATE',
        resumeUploaded: true,
        resumeFileReference: 'uploads/resume_candidate2.pdf',
        jobRole: 'Loan Officer',
        location: 'Chennai',
      },
      {
        mobile: '6666666666',
        role: 'CANDIDATE',
        resumeUploaded: false,
        jobRole: 'Teller',
        location: 'Pune',
      },
      {
        mobile: '5555555555',
        role: 'CANDIDATE',
        resumeUploaded: true,
        resumeFileReference: 'uploads/resume_candidate3.pdf',
        jobRole: 'Credit Analyst',
        location: 'Hyderabad',
      },
      {
        mobile: '4444444444',
        role: 'CANDIDATE',
        resumeUploaded: true,
        resumeFileReference: 'uploads/resume_candidate4.pdf',
        jobRole: 'Relationship Manager',
        location: 'Kolkata',
      },
      {
        mobile: '3333333333',
        role: 'CANDIDATE',
        resumeUploaded: false,
        jobRole: 'Financial Advisor',
        location: 'Ahmedabad',
      },
      {
        mobile: '2222222222',
        role: 'CANDIDATE',
        resumeUploaded: true,
        resumeFileReference: 'uploads/resume_candidate5.pdf',
        jobRole: 'Operations Manager',
        location: 'Jaipur',
      },
      {
        mobile: '1111111111',
        role: 'CANDIDATE',
        resumeUploaded: true,
        resumeFileReference: 'uploads/resume_candidate6.pdf',
        jobRole: 'Sales Manager',
        location: 'Surat',
      },
      {
        mobile: '0000000000',
        role: 'CANDIDATE',
        resumeUploaded: false,
        jobRole: 'Business Development Manager',
        location: 'Indore',
      },
      {
        mobile: '9999999990',
        role: 'CANDIDATE',
        resumeUploaded: true,
        resumeFileReference: 'uploads/resume_candidate7.pdf',
        jobRole: 'Personal Banker',
        location: 'Nagpur',
      },
      {
        mobile: '8888888880',
        role: 'CANDIDATE',
        resumeUploaded: true,
        resumeFileReference: 'uploads/resume_candidate8.pdf',
        jobRole: 'Mortgage Sales Officer',
        location: 'Vadodara',
      },
      {
        mobile: '7777777770',
        role: 'CANDIDATE',
        resumeUploaded: false,
        jobRole: 'Investment Sales Advisor',
        location: 'Coimbatore',
      },
      {
        mobile: '6666666660',
        role: 'CANDIDATE',
        resumeUploaded: true,
        resumeFileReference: 'uploads/resume_candidate9.pdf',
        jobRole: 'Insurance Sales Officer',
        location: 'Mysore',
      },
      {
        mobile: '5555555550',
        role: 'CANDIDATE',
        resumeUploaded: true,
        resumeFileReference: 'uploads/resume_candidate10.pdf',
        jobRole: 'Corporate Sales Executive',
        location: 'Vijayawada',
      },
    ];

    const createdUsers = [];
    for (const userData of users) {
      const user = await User.create(userData);
      createdUsers.push(user);
    }

    // Map users by role for easy reference
    const admin = createdUsers.find(u => u.role === 'ADMIN');
    const manager = createdUsers.find(u => u.role === 'MANAGER');
    const employee = createdUsers.find(u => u.role === 'EMPLOYEE');
    const candidates = createdUsers.filter(u => u.role === 'CANDIDATE');
    const [candidate1, candidate2, candidate3, candidate4, candidate5, candidate6, candidate7, candidate8, candidate9, candidate10, candidate11, candidate12, candidate13, candidate14] = candidates;

    // Create comprehensive sample jobs
    const jobs = [
      {
        title: 'Bank Manager',
        bankName: 'State Bank of India',
        location: 'Mumbai',
        description: 'Manage bank operations and customer service. Lead a team of banking professionals and ensure excellent customer experience.',
        createdBy: admin.id,
      },
      {
        title: 'Loan Officer',
        bankName: 'HDFC Bank',
        location: 'Delhi',
        description: 'Process loan applications and assist customers with their financing needs. Evaluate creditworthiness and manage loan portfolios.',
        createdBy: admin.id,
      },
      {
        title: 'Teller',
        bankName: 'ICICI Bank',
        location: 'Bangalore',
        description: 'Handle cash transactions and customer inquiries at the branch counter. Provide accurate and efficient service.',
        createdBy: manager.id,
      },
      {
        title: 'Credit Analyst',
        bankName: 'Axis Bank',
        location: 'Chennai',
        description: 'Analyze credit applications and perform risk assessment. Prepare credit reports and recommendations.',
        createdBy: manager.id,
      },
      {
        title: 'Branch Manager',
        bankName: 'Punjab National Bank',
        location: 'Kolkata',
        description: 'Oversee branch operations and team management. Ensure compliance and achieve business targets.',
        createdBy: admin.id,
      },
      {
        title: 'Relationship Manager',
        bankName: 'Kotak Mahindra Bank',
        location: 'Pune',
        description: 'Build and maintain client relationships. Cross-sell banking products and provide financial advice.',
        createdBy: manager.id,
      },
      {
        title: 'Financial Advisor',
        bankName: 'IDBI Bank',
        location: 'Ahmedabad',
        description: 'Provide financial planning and investment advice to high-net-worth clients.',
        createdBy: admin.id,
      },
      {
        title: 'Operations Manager',
        bankName: 'Bandhan Bank',
        location: 'Hyderabad',
        description: 'Oversee daily operations and efficiency improvements. Manage operational risk and compliance.',
        createdBy: manager.id,
      },
      // Sales Office Positions
      {
        title: 'Sales Manager',
        bankName: 'HDFC Bank',
        location: 'Mumbai Sales Office',
        description: 'Lead sales team and drive banking product sales targets. Develop sales strategies and mentor team members.',
        createdBy: admin.id,
      },
      {
        title: 'Business Development Manager',
        bankName: 'ICICI Bank',
        location: 'Delhi Sales Office',
        description: 'Develop business relationships and expand market presence. Identify new business opportunities.',
        createdBy: manager.id,
      },
      {
        title: 'Personal Banker',
        bankName: 'Axis Bank',
        location: 'Bangalore Sales Office',
        description: 'Provide personalized banking solutions and cross-sell products to retail customers.',
        createdBy: admin.id,
      },
      {
        title: 'Mortgage Sales Officer',
        bankName: 'Kotak Mahindra Bank',
        location: 'Chennai Sales Office',
        description: 'Sell home loans and mortgage products to customers. Guide customers through the loan process.',
        createdBy: manager.id,
      },
      {
        title: 'Investment Sales Advisor',
        bankName: 'IDBI Bank',
        location: 'Pune Sales Office',
        description: 'Advise customers on investment products and mutual funds. Build investment portfolios.',
        createdBy: admin.id,
      },
      {
        title: 'Insurance Sales Officer',
        bankName: 'Bandhan Bank',
        location: 'Kolkata Sales Office',
        description: 'Sell insurance products and financial protection plans. Meet sales targets and build customer relationships.',
        createdBy: manager.id,
      },
      {
        title: 'Corporate Sales Executive',
        bankName: 'State Bank of India',
        location: 'Hyderabad Sales Office',
        description: 'Handle corporate banking sales and relationship management. Serve corporate clients and their banking needs.',
        createdBy: admin.id,
      },
      {
        title: 'Retail Sales Manager',
        bankName: 'Punjab National Bank',
        location: 'Ahmedabad Sales Office',
        description: 'Manage retail banking sales and customer acquisition. Lead a team of retail bankers.',
        createdBy: manager.id,
      },
      {
        title: 'Wealth Management Advisor',
        bankName: 'HDFC Bank',
        location: 'Gurgaon Sales Office',
        description: 'Provide wealth management and portfolio advisory services to high-net-worth individuals.',
        createdBy: admin.id,
      },
      {
        title: 'Digital Banking Sales Specialist',
        bankName: 'ICICI Bank',
        location: 'Noida Sales Office',
        description: 'Promote digital banking solutions and online services. Drive digital adoption among customers.',
        createdBy: manager.id,
      },
      {
        title: 'SME Sales Officer',
        bankName: 'Axis Bank',
        location: 'Jaipur Sales Office',
        description: 'Focus on small and medium enterprise banking sales. Build relationships with SME owners.',
        createdBy: admin.id,
      },
      {
        title: 'Priority Banking Sales Manager',
        bankName: 'Kotak Mahindra Bank',
        location: 'Surat Sales Office',
        description: 'Manage high-value customer relationships and premium services. Provide exclusive banking solutions.',
        createdBy: manager.id,
      },
      {
        title: 'Forex Sales Executive',
        bankName: 'IDBI Bank',
        location: 'Indore Sales Office',
        description: 'Handle foreign exchange services and international banking. Assist with forex transactions.',
        createdBy: admin.id,
      },
      {
        title: 'Credit Card Sales Officer',
        bankName: 'Bandhan Bank',
        location: 'Nagpur Sales Office',
        description: 'Promote credit card products and manage applications. Achieve sales targets for credit cards.',
        createdBy: manager.id,
      },
      {
        title: 'Branch Sales Head',
        bankName: 'State Bank of India',
        location: 'Vadodara Sales Office',
        description: 'Lead sales initiatives across multiple branches. Coordinate sales activities and reporting.',
        createdBy: admin.id,
      },
      {
        title: 'Product Sales Specialist',
        bankName: 'Punjab National Bank',
        location: 'Coimbatore Sales Office',
        description: 'Specialize in selling specific banking products and services. Product knowledge expert.',
        createdBy: manager.id,
      },
      // Additional diverse positions
      {
        title: 'Risk Analyst',
        bankName: 'Bank of Baroda',
        location: 'Mumbai',
        description: 'Analyze financial risks and prepare risk reports. Monitor risk metrics and compliance.',
        createdBy: admin.id,
      },
      {
        title: 'Compliance Officer',
        bankName: 'Canara Bank',
        location: 'Delhi',
        description: 'Ensure regulatory compliance and manage compliance programs. Conduct compliance audits.',
        createdBy: manager.id,
      },
      {
        title: 'IT Security Specialist',
        bankName: 'Union Bank of India',
        location: 'Bangalore',
        description: 'Manage information security and cybersecurity measures. Implement security protocols.',
        createdBy: admin.id,
      },
      {
        title: 'HR Manager',
        bankName: 'Indian Bank',
        location: 'Chennai',
        description: 'Manage human resources functions and employee relations. Handle recruitment and training.',
        createdBy: manager.id,
      },
      {
        title: 'Internal Auditor',
        bankName: 'Central Bank of India',
        location: 'Kolkata',
        description: 'Conduct internal audits and prepare audit reports. Assess operational effectiveness.',
        createdBy: admin.id,
      },
    ];

    for (const jobData of jobs) {
      await Job.create(jobData);
    }

    // Create comprehensive applications with different statuses
    const applications = [
      // Candidate 1 applications (with resume)
      { jobId: 1, candidateId: candidate1.id, status: 'APPLIED' },
      { jobId: 2, candidateId: candidate1.id, status: 'INTERVIEW' },
      { jobId: 3, candidateId: candidate1.id, status: 'SELECTED' },
      { jobId: 4, candidateId: candidate1.id, status: 'JOINED' },
      { jobId: 9, candidateId: candidate1.id, status: 'APPLIED' },
      { jobId: 10, candidateId: candidate1.id, status: 'SELECTED' },
      { jobId: 15, candidateId: candidate1.id, status: 'JOINED' },

      // Candidate 2 applications (with resume)
      { jobId: 5, candidateId: candidate2.id, status: 'APPLIED' },
      { jobId: 6, candidateId: candidate2.id, status: 'APPLIED' },
      { jobId: 7, candidateId: candidate2.id, status: 'INTERVIEW' },
      { jobId: 11, candidateId: candidate2.id, status: 'INTERVIEW' },
      { jobId: 12, candidateId: candidate2.id, status: 'APPLIED' },
      { jobId: 16, candidateId: candidate2.id, status: 'SELECTED' },

      // Candidate 3 applications (no resume)
      { jobId: 3, candidateId: candidate3.id, status: 'APPLIED' },
      { jobId: 8, candidateId: candidate3.id, status: 'APPLIED' },
      { jobId: 13, candidateId: candidate3.id, status: 'APPLIED' },

      // Candidate 4 applications (with resume)
      { jobId: 1, candidateId: candidate4.id, status: 'JOINED' },
      { jobId: 7, candidateId: candidate4.id, status: 'SELECTED' },
      { jobId: 14, candidateId: candidate4.id, status: 'APPLIED' },
      { jobId: 18, candidateId: candidate4.id, status: 'INTERVIEW' },

      // Candidate 5 applications (with resume)
      { jobId: 2, candidateId: candidate5.id, status: 'APPLIED' },
      { jobId: 9, candidateId: candidate5.id, status: 'SELECTED' },
      { jobId: 17, candidateId: candidate5.id, status: 'JOINED' },

      // Candidate 6 applications (with resume)
      { jobId: 4, candidateId: candidate6.id, status: 'APPLIED' },
      { jobId: 11, candidateId: candidate6.id, status: 'JOINED' },
      { jobId: 19, candidateId: candidate6.id, status: 'INTERVIEW' },

      // Candidate 7 applications (no resume)
      { jobId: 6, candidateId: candidate7.id, status: 'APPLIED' },
      { jobId: 12, candidateId: candidate7.id, status: 'APPLIED' },

      // Candidate 8 applications (with resume)
      { jobId: 8, candidateId: candidate8.id, status: 'SELECTED' },
      { jobId: 15, candidateId: candidate8.id, status: 'APPLIED' },
      { jobId: 20, candidateId: candidate8.id, status: 'JOINED' },

      // Candidate 9 applications (with resume)
      { jobId: 3, candidateId: candidate9.id, status: 'APPLIED' },
      { jobId: 10, candidateId: candidate9.id, status: 'INTERVIEW' },

      // Candidate 10 applications (with resume)
      { jobId: 5, candidateId: candidate10.id, status: 'JOINED' },
      { jobId: 13, candidateId: candidate10.id, status: 'SELECTED' },

      // Additional applications for new jobs (using valid job IDs 21-25)
      { jobId: 21, candidateId: candidate1.id, status: 'APPLIED' },
      { jobId: 22, candidateId: candidate2.id, status: 'INTERVIEW' },
      { jobId: 23, candidateId: candidate3.id, status: 'APPLIED' },
      { jobId: 24, candidateId: candidate4.id, status: 'SELECTED' },
      { jobId: 25, candidateId: candidate5.id, status: 'JOINED' },
    ];

    for (const appData of applications) {
      await Application.create(appData);
    }

    // Create comprehensive referrals with different statuses
    const referrals = [
      // Candidate 1 referrals
      { candidateMobile: '6666666666', jobId: 1, referrerId: candidate1.id, status: 'REFERRED' },
      { candidateMobile: '5555555555', jobId: 2, referrerId: candidate1.id, status: 'APPLIED' },
      { candidateMobile: '4444444444', jobId: 3, referrerId: candidate1.id, status: 'JOINED' },
      { candidateMobile: '3333333333', jobId: 9, referrerId: candidate1.id, status: 'APPLIED' },
      { candidateMobile: '2222222222', jobId: 10, referrerId: candidate1.id, status: 'JOINED' },
      { candidateMobile: '1111111111', jobId: 15, referrerId: candidate1.id, status: 'REFERRED' },

      // Candidate 2 referrals
      { candidateMobile: '0000000000', jobId: 4, referrerId: candidate2.id, status: 'REFERRED' },
      { candidateMobile: '9999999990', jobId: 5, referrerId: candidate2.id, status: 'APPLIED' },
      { candidateMobile: '8888888880', jobId: 11, referrerId: candidate2.id, status: 'JOINED' },
      { candidateMobile: '7777777770', jobId: 12, referrerId: candidate2.id, status: 'REFERRED' },
      { candidateMobile: '6666666660', jobId: 16, referrerId: candidate2.id, status: 'APPLIED' },

      // Candidate 4 referrals
      { candidateMobile: '5555555550', jobId: 7, referrerId: candidate4.id, status: 'JOINED' },
      { candidateMobile: '4444444440', jobId: 14, referrerId: candidate4.id, status: 'REFERRED' },
      { candidateMobile: '3333333330', jobId: 18, referrerId: candidate4.id, status: 'APPLIED' },

      // Candidate 5 referrals
      { candidateMobile: '2222222220', jobId: 2, referrerId: candidate5.id, status: 'REFERRED' },
      { candidateMobile: '1111111110', jobId: 9, referrerId: candidate5.id, status: 'JOINED' },

      // Candidate 6 referrals
      { candidateMobile: '0000000001', jobId: 4, referrerId: candidate6.id, status: 'APPLIED' },
      { candidateMobile: '9999999991', jobId: 11, referrerId: candidate6.id, status: 'REFERRED' },

      // Additional referrals for new jobs (using valid job IDs 21-25)
      { candidateMobile: '8888888881', jobId: 21, referrerId: candidate1.id, status: 'REFERRED' },
      { candidateMobile: '7777777771', jobId: 22, referrerId: candidate2.id, status: 'APPLIED' },
      { candidateMobile: '6666666661', jobId: 23, referrerId: candidate3.id, status: 'JOINED' },
      { candidateMobile: '5555555551', jobId: 24, referrerId: candidate4.id, status: 'REFERRED' },
      { candidateMobile: '4444444441', jobId: 25, referrerId: candidate5.id, status: 'APPLIED' },
    ];

    for (const refData of referrals) {
      await Referral.create(refData);
    }

    // Create comprehensive earnings with different types and amounts
    const earnings = [
      // Candidate 1 earnings
      { userId: candidate1.id, amount: 1000, type: 'REFERRAL', description: 'Referral bonus for Bank Manager position' },
      { userId: candidate1.id, amount: 500, type: 'REFERRAL', description: 'Partial bonus for Loan Officer referral' },
      { userId: candidate1.id, amount: 1500, type: 'REFERRAL', description: 'Sales Manager position referral bonus' },
      { userId: candidate1.id, amount: 800, type: 'REFERRAL', description: 'Personal Banker referral bonus' },
      { userId: candidate1.id, amount: 2000, type: 'REFERRAL', description: 'Insurance Sales Officer referral' },

      // Candidate 2 earnings
      { userId: candidate2.id, amount: 2000, type: 'REFERRAL', description: 'Multiple referral bonuses' },
      { userId: candidate2.id, amount: 1200, type: 'REFERRAL', description: 'Business Development Manager referral' },
      { userId: candidate2.id, amount: 1800, type: 'REFERRAL', description: 'Mortgage Sales Officer referral' },
      { userId: candidate2.id, amount: 2500, type: 'REFERRAL', description: 'High-value sales referrals' },

      // Candidate 4 earnings
      { userId: candidate4.id, amount: 3000, type: 'REFERRAL', description: 'Relationship Manager successful referral' },
      { userId: candidate4.id, amount: 1200, type: 'REFERRAL', description: 'Investment Sales Advisor referral' },
      { userId: candidate4.id, amount: 800, type: 'REFERRAL', description: 'Priority Banking referral bonus' },

      // Candidate 5 earnings
      { userId: candidate5.id, amount: 2500, type: 'REFERRAL', description: 'Wealth Management Advisor referral' },
      { userId: candidate5.id, amount: 1500, type: 'REFERRAL', description: 'Corporate Sales Executive referral' },

      // Candidate 6 earnings
      { userId: candidate6.id, amount: 1800, type: 'REFERRAL', description: 'Operations Manager referral bonus' },
      { userId: candidate6.id, amount: 2200, type: 'REFERRAL', description: 'Digital Banking Sales Specialist referral' },

      // Additional earnings for various scenarios
      { userId: candidate1.id, amount: 3500, type: 'REFERRAL', description: 'Risk Analyst position referral' },
      { userId: candidate2.id, amount: 2800, type: 'REFERRAL', description: 'Compliance Officer referral' },
      { userId: candidate3.id, amount: 1200, type: 'REFERRAL', description: 'IT Security Specialist referral' },
      { userId: candidate4.id, amount: 1900, type: 'REFERRAL', description: 'HR Manager referral bonus' },
      { userId: candidate5.id, amount: 2400, type: 'REFERRAL', description: 'Internal Auditor referral' },

      // Bonus earnings for high performers
      { userId: candidate1.id, amount: 5000, type: 'BONUS', description: 'Performance bonus for multiple successful referrals' },
      { userId: candidate2.id, amount: 4500, type: 'BONUS', description: 'Top referrer bonus' },
      { userId: candidate4.id, amount: 3000, type: 'BONUS', description: 'Quarterly achievement bonus' },

      // Commission earnings
      { userId: candidate1.id, amount: 800, type: 'COMMISSION', description: 'Commission for sales referral' },
      { userId: candidate2.id, amount: 1200, type: 'COMMISSION', description: 'Commission for premium product referral' },
      { userId: candidate5.id, amount: 900, type: 'COMMISSION', description: 'Commission for investment product referral' },
    ];

    for (const earnData of earnings) {
      await Earning.create(earnData);
    }

    // Add initial referrals/earnings for EMPLOYEE if present
    if (employee) {
      await Referral.create({ candidateMobile: '9999988888', jobId: 1, referrerId: employee.id, status: 'REFERRED' });
      await Referral.create({ candidateMobile: '9999987777', jobId: 2, referrerId: employee.id, status: 'APPLIED' });
      await Earning.create({ userId: employee.id, amount: 1500, type: 'REFERRAL', description: 'Employee referral sample' });
      await Earning.create({ userId: employee.id, amount: 500, type: 'COMMISSION', description: 'Employee commission sample' });
    }

    // Add default app settings
    const AppSetting = require('./src/models/AppSetting');
    await AppSetting.create({ maxReferralsPerDay: 5, maxReferralsPerMonth: 50, defaultReferralExpiryDays: 30 });

    // Add sample referral reward configs
    const ReferralRewardConfig = require('./src/models/ReferralRewardConfig');
    await ReferralRewardConfig.create({ bankName: 'State Bank of India', jobRole: 'Bank Manager', rewardAmount: 2000 });
    await ReferralRewardConfig.create({ bankName: 'HDFC Bank', jobRole: 'Loan Officer', rewardAmount: 1500 });

    console.log('Database seeded successfully with comprehensive test data!');
    console.log('\n=== TEST ACCOUNTS ===');
    console.log('Admin: 9999999999');
    console.log('Manager: 8888888888');
    console.log('\n=== CANDIDATE ACCOUNTS (with resume uploaded) ===');
    console.log('Candidate 1: 8593986894 (Bank Manager, Bangalore) - Multiple applications & referrals');
    console.log('Candidate 2: 7777777777 (Loan Officer, Chennai) - Active referrer');
    console.log('Candidate 4: 4444444444 (Relationship Manager, Kolkata) - High earner');
    console.log('Candidate 5: 2222222222 (Operations Manager, Jaipur) - Successful referrals');
    console.log('Candidate 6: 1111111111 (Sales Manager, Surat) - Active in sales positions');
    console.log('Candidate 8: 8888888880 (Mortgage Sales Officer, Vadodara) - Sales specialist');
    console.log('Candidate 9: 7777777770 (Investment Sales Advisor, Coimbatore) - Investment focus');
    console.log('Candidate 10: 5555555550 (Corporate Sales Executive, Vijayawada) - Corporate sales');
    console.log('\n=== CANDIDATE ACCOUNTS (no resume) ===');
    console.log('Candidate 3: 6666666666 (Teller, Pune) - Basic profile');
    console.log('Candidate 7: 0000000000 (Business Development Manager, Indore) - Limited activity');
    console.log('\n=== TEST SCENARIOS AVAILABLE ===');
    console.log('✓ Job browsing and application (30+ jobs across all banks)');
    console.log('✓ Resume upload/download functionality');
    console.log('✓ Referral system with different statuses');
    console.log('✓ Earnings tracking (Referral, Bonus, Commission)');
    console.log('✓ Admin job management');
    console.log('✓ Application status tracking (Applied → Interview → Selected → Joined)');
    console.log('✓ User profiles with different completion levels');
    console.log('\n=== RECOMMENDED TEST FLOW ===');
    console.log('1. Login as Candidate 1 (8593986894) - test resume download');
    console.log('2. Login as Admin (9999999999) - test job management');
    console.log('3. Login as Candidate 3 (6666666666) - test resume upload');
    console.log('4. Check referral earnings for Candidate 2 (7777777777)');
    console.log('5. Test application status flow for various candidates');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();