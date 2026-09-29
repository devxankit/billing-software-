require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

async function checkLedger() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const Bill = require('../models/Bill');
    const Transaction = require('../models/Transaction');
    const Party = require('../models/Party');

    const party = await Party.findOne({ name: { $regex: 'Deep Internationals', $options: 'i' } });
    if (party) {
        console.log('Party:', party.name);
        console.log('Opening Balance:', party.openingBalance);
        console.log('Current DB Balance:', party.balance);

        const bills = await Bill.find({ party: party._id }).sort({ date: 1 });
        console.log('\nBills:');
        bills.forEach(b => console.log(`${b.date.toISOString().split('T')[0]} | ${b.invoiceNumber || 'No Invoice'} | Amount: ${b.totalAmount || b.grandTotal} | Due: ${b.dueAmount}`));

        const txns = await Transaction.find({ party: party._id }).sort({ date: 1 });
        console.log('\nTransactions:');
        txns.forEach(t => console.log(`${t.date.toISOString().split('T')[0]} | ${t.type} | Amount: ${t.amount} | Method: ${t.paymentMethod} | Remarks: ${t.remarks}`));
    } else {
        console.log('Party not found in DB');
    }
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
}

checkLedger();
