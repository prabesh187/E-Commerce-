import mongoose from 'mongoose';
import { config } from '../config/env.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Banner from '../models/Banner.js';

/**
 * Seed database with sample data
 * Run with: npm run seed
 */

const sampleProducts = [
  {
    title: { en: 'Handwoven Dhaka Topi', ne: 'हस्तनिर्मित ढाका टोपी' },
    description: {
      en: 'Traditional Nepali Dhaka topi handwoven by local artisans. Perfect for cultural events and daily wear.',
      ne: 'स्थानीय कारीगरहरूद्वारा हातले बुनेको परम्परागत नेपाली ढाका टोपी। सांस्कृतिक कार्यक्रम र दैनिक प्रयोगको लागि उपयुक्त।'
    },
    price: 500,
    category: 'clothing',
    images: ['https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800'],
    inventory: 50,
    verificationStatus: 'approved',
    isActive: true,
  },
  {
    title: { en: 'Nepali Pashmina Shawl', ne: 'नेपाली पश्मिना शल' },
    description: {
      en: 'Luxurious handmade pashmina shawl from the Himalayas. Soft, warm, and elegant.',
      ne: 'हिमालयबाट हस्तनिर्मित विलासी पश्मिना शल। नरम, न्यानो र सुरुचिपूर्ण।'
    },
    price: 3500,
    category: 'clothing',
    images: ['https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800'],
    inventory: 30,
    verificationStatus: 'approved',
    isActive: true,
  },
  {
    title: { en: 'Traditional Khukuri Knife', ne: 'परम्परागत खुकुरी' },
    description: {
      en: 'Authentic Nepali Khukuri knife handcrafted by skilled blacksmiths. A symbol of Nepali heritage.',
      ne: 'दक्ष लोहारहरूद्वारा हस्तनिर्मित प्रामाणिक नेपाली खुकुरी। नेपाली सम्पदाको प्रतीक।'
    },
    price: 2500,
    category: 'handicrafts',
    images: ['https://images.unsplash.com/photo-1595433707802-6b2626ef1c91?w=800'],
    inventory: 20,
    verificationStatus: 'approved',
    isActive: true,
  },
  {
    title: { en: 'Singing Bowl Set', ne: 'गाउने कचौरा सेट' },
    description: {
      en: 'Handmade Tibetan singing bowl for meditation and healing. Produces soothing sounds.',
      ne: 'ध्यान र उपचारको लागि हस्तनिर्मित तिब्बती गाउने कचौरा। मनमोहक आवाज उत्पन्न गर्दछ।'
    },
    price: 4500,
    category: 'handicrafts',
    images: ['https://images.unsplash.com/photo-1545128485-c400e7702796?w=800'],
    inventory: 15,
    verificationStatus: 'approved',
    isActive: true,
  },
  {
    title: { en: 'Nepali Tea (Ilam)', ne: 'नेपाली चिया (इलाम)' },
    description: {
      en: 'Premium orthodox tea from Ilam, Nepal. Rich flavor and aroma from the Himalayan gardens.',
      ne: 'इलाम, नेपालबाट प्रिमियम अर्थोडक्स चिया। हिमालयन बगैंचाबाट समृद्ध स्वाद र सुगन्ध।'
    },
    price: 800,
    category: 'food',
    images: ['https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800'],
    inventory: 100,
    verificationStatus: 'approved',
    isActive: true,
  },
  {
    title: { en: 'Organic Himalayan Honey', ne: 'जैविक हिमालयन मह' },
    description: {
      en: 'Pure organic honey harvested from Himalayan wildflowers. Natural and unprocessed.',
      ne: 'हिमालयन जंगली फूलहरूबाट संकलित शुद्ध जैविक मह। प्राकृतिक र अप्रशोधित।'
    },
    price: 1200,
    category: 'food',
    images: ['https://images.unsplash.com/photo-1587049352846-4a222e784422?w=800'],
    inventory: 60,
    verificationStatus: 'approved',
    isActive: true,
  },
  {
    title: { en: 'Handmade Paper Notebook', ne: 'हस्तनिर्मित कागज नोटबुक' },
    description: {
      en: 'Eco-friendly notebook made from traditional Nepali lokta paper. Perfect for journaling.',
      ne: 'परम्परागत नेपाली लोक्ता कागजबाट बनेको पर्यावरण मैत्री नोटबुक। जर्नलिङको लागि उत्तम।'
    },
    price: 450,
    category: 'handicrafts',
    images: ['https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800'],
    inventory: 80,
    verificationStatus: 'approved',
    isActive: true,
  },
  {
    title: { en: 'Thangka Painting', ne: 'थाङ्का चित्रकला' },
    description: {
      en: 'Traditional Buddhist Thangka painting handpainted by skilled artists. Spiritual art piece.',
      ne: 'दक्ष कलाकारहरूद्वारा हातले चित्रित परम्परागत बौद्ध थाङ्का। आध्यात्मिक कला।'
    },
    price: 8500,
    category: 'handicrafts',
    images: ['https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800'],
    inventory: 10,
    verificationStatus: 'approved',
    isActive: true,
  },
  {
    title: { en: 'Nepali Spice Mix', ne: 'नेपाली मसला मिश्रण' },
    description: {
      en: 'Authentic Nepali spice blend for traditional cooking. Adds rich flavor to your dishes.',
      ne: 'परम्परागत खाना पकाउनको लागि प्रामाणिक नेपाली मसला मिश्रण। तपाईंको परिकारमा समृद्ध स्वाद थप्छ।'
    },
    price: 350,
    category: 'food',
    images: ['https://images.unsplash.com/photo-1596040033229-a0b3b83b3584?w=800'],
    inventory: 120,
    verificationStatus: 'approved',
    isActive: true,
  },
  {
    title: { en: 'Wool Carpet', ne: 'ऊनी कार्पेट' },
    description: {
      en: 'Hand-knotted Tibetan wool carpet with traditional designs. Durable and beautiful.',
      ne: 'परम्परागत डिजाइनको साथ हातले गाँठो लगाइएको तिब्बती ऊनी कार्पेट। टिकाउ र सुन्दर।'
    },
    price: 15000,
    category: 'handicrafts',
    images: ['https://images.unsplash.com/photo-1600166898405-da9535204843?w=800'],
    inventory: 8,
    verificationStatus: 'approved',
    isActive: true,
  },
  {
    title: { en: 'Bamboo Handicraft Basket', ne: 'बाँसको हस्तकला टोकरी' },
    description: {
      en: 'Eco-friendly bamboo basket handwoven by local artisans. Multi-purpose storage solution.',
      ne: 'स्थानीय कारीगरहरूद्वारा हातले बुनेको पर्यावरण मैत्री बाँसको टोकरी। बहुउद्देश्यीय भण्डारण समाधान।'
    },
    price: 650,
    category: 'handicrafts',
    images: ['https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800'],
    inventory: 40,
    verificationStatus: 'approved',
    isActive: true,
  },
  {
    title: { en: 'Silver Jewelry Set', ne: 'चाँदीको गहना सेट' },
    description: {
      en: 'Traditional Nepali silver jewelry set with intricate designs. Handcrafted by skilled artisans.',
      ne: 'जटिल डिजाइनको साथ परम्परागत नेपाली चाँदीको गहना सेट। दक्ष कारीगरहरूद्वारा हस्तनिर्मित।'
    },
    price: 5500,
    category: 'handicrafts',
    images: ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800'],
    inventory: 25,
    verificationStatus: 'approved',
    isActive: true,
  },
];

const sampleBanners = [
  {
    title: { en: 'Welcome to Made in Nepal', ne: 'मेड इन नेपालमा स्वागत छ' },
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200',
    link: '/products',
    active: true,
    displayOrder: 1,
  },
  {
    title: { en: 'Handcrafted with Love', ne: 'मायाले हस्तनिर्मित' },
    image: 'https://images.unsplash.com/photo-1452421822248-d4c2b47f0c81?w=1200',
    link: '/products?category=handicrafts',
    active: true,
    displayOrder: 2,
  },
  {
    title: { en: 'Taste of Himalayas', ne: 'हिमालयको स्वाद' },
    image: 'https://images.unsplash.com/photo-1464207687429-7505649dae38?w=1200',
    link: '/products?category=food',
    active: true,
    displayOrder: 3,
  },
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to database
    await mongoose.connect(config.mongodbUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Product.deleteMany({});
    await Banner.deleteMany({});

    // Create admin user
    console.log('👤 Creating admin user...');
    await User.create({
      email: 'admin@madeinnepal.com',
      password: 'Admin@123',
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      verificationStatus: 'approved',
    });
    console.log('✅ Admin created: admin@madeinnepal.com / Admin@123');

    // Create seller user
    console.log('👤 Creating seller user...');
    const seller = await User.create({
      email: 'seller@madeinnepal.com',
      password: 'Seller@123',
      role: 'seller',
      firstName: 'Nepali',
      lastName: 'Artisan',
      verificationStatus: 'approved',
    });
    console.log('✅ Seller created: seller@madeinnepal.com / Seller@123');

    // Create buyer user
    console.log('👤 Creating buyer user...');
    await User.create({
      email: 'buyer@madeinnepal.com',
      password: 'Buyer@123',
      role: 'buyer',
      firstName: 'Test',
      lastName: 'Buyer',
      verificationStatus: 'approved',
    });
    console.log('✅ Buyer created: buyer@madeinnepal.com / Buyer@123');

    // Create products
    console.log('📦 Creating sample products...');
    const productsWithSeller = sampleProducts.map(product => ({
      ...product,
      sellerId: seller._id,
    }));
    await Product.insertMany(productsWithSeller);
    console.log(`✅ Created ${sampleProducts.length} products`);

    // Create banners
    console.log('🎨 Creating banners...');
    await Banner.insertMany(sampleBanners);
    console.log(`✅ Created ${sampleBanners.length} banners`);

    console.log('\n🎉 Database seeding completed successfully!\n');
    console.log('📝 Test Accounts:');
    console.log('   Admin:  admin@madeinnepal.com  / Admin@123');
    console.log('   Seller: seller@madeinnepal.com / Seller@123');
    console.log('   Buyer:  buyer@madeinnepal.com  / Buyer@123');
    console.log('\n🚀 You can now start the application and login with these accounts.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seeder
seedDatabase();
