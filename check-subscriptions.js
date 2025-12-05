import mongoose from 'mongoose';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URL;

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log('\nAll collections:');
    collections.forEach(col => console.log(`  - ${col.name}`));
    
    // Check subscrptions
    console.log('\n=== Checking subscrptions collection (old typo) ===');
    const oldSubs = await db.collection('subscrptions').countDocuments();
    console.log(`Documents in "subscrptions": ${oldSubs}`);
    
    if (oldSubs > 0) {
      const sampleOld = await db.collection('subscrptions').find().limit(2).toArray();
      console.log('Sample documents:', JSON.stringify(sampleOld, null, 2));
    }
    
    // Check subscriptions
    console.log('\n=== Checking subscriptions collection (correct name) ===');
    const newSubs = await db.collection('subscriptions').countDocuments();
    console.log(`Documents in "subscriptions": ${newSubs}`);
    
    if (newSubs > 0) {
      const sampleNew = await db.collection('subscriptions').find().limit(2).toArray();
      console.log('Sample documents:', JSON.stringify(sampleNew, null, 2));
    }
    
    // If old collection has data but new doesn't, migrate
    if (oldSubs > 0 && newSubs === 0) {
      console.log('\n=== Migrating data from subscrptions to subscriptions ===');
      const allOldDocs = await db.collection('subscrptions').find().toArray();
      await db.collection('subscriptions').insertMany(allOldDocs);
      console.log(`Migrated ${allOldDocs.length} documents`);
    }
    
    await mongoose.connection.close();
    console.log('\nDone!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
