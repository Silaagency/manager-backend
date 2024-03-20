
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const saltRounds = 10;

const whitelist = ['*']; // assuming front-end application is running on localhost port 3000

const corsOptions = {
  origin: '*',
}

// Connect to MongoDB
mongoose.connect("mongodb+srv://kothmane98:PB2cpvKAFRm3YDNH@cluster0.ujtm73l.mongodb.net/?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const newEmployeeInfoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  service: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
});

const confirmedEmployeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  service: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  sessionIds : [String]
});


const employeeSchema = new mongoose.Schema({
  employeeInfo: {
    name: { type: String, required: true },
    service: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
  },
  paymentInfo: {
    hasSalary: { type: Boolean, required: true },
    paidCommissions: { type: Boolean, required: true },
    penalizedAbsence: { type: Boolean, required: true },
    salary: { type: Number, required: true },
    absence: { type: Number, default: 0 },
  },
});

const commissionTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  pay: { type: Number, required: true },
});

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  commercialPay: { type: Number, required: true },
  commissions: [commissionTypeSchema],
});

const newProjectInfoSchema = new mongoose.Schema({
  service: { type: String, required: true },
  pay: { type: Number, required: true },
  clientName: { type: String, required: true },
  clientNumber: { type: String, required: true },
  name: { type: String, required: true },
});

const projectInfoSchema = new mongoose.Schema({
  service: { type: String, required: true },
  type: { type: String, required: true },
  quantity: { type: Number, required: true },
  pay: { type: Number, required: true },
  clientName: { type: String, required: true },
  clientNumber: { type: String, required: true },
  name: { type: String, required: true },
});

const newCommissionSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  project: { type: newProjectInfoSchema, required: true },
  employee: { type: String, required: true },
  comment: { type: String, required: false },
  numeroFacture: { type: String, required: true },
  status: { type: String, required: true },
});

const commissionSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  project: { type: projectInfoSchema, required: true },
  employee: { type: String, required: true },
  status: { type: String, required: true },
  employeeComment: { type: String, required: true },
  employerComment: { type: String, required: false },
});

const paymentDetailsSchema = new mongoose.Schema({
  salary: { type: Number, required: true },
  commissions: { type: Number, required: true },
  penalty: { type: Number, required: true },
  prepaid: { type: Number, required: true },
  payed: { type: Number, required: true }
});

const paymentSchema = new mongoose.Schema({
  employee: { type: String, required: true },
  comment: { type: String, required: true},
  date: { type: Date, required: true },
  amount: { type: Number, required: true },
});

const finalPaymentSchema = new mongoose.Schema({
  employee: { type: String, required: true },
  date: { type: Date, required: true },
  amount: { type: Number, required: true },
  details: { type: paymentDetailsSchema, required: true}
});

const adminSchema = new mongoose.Schema({
  email: {type: String, required: true},
});

// Define Models
const NewEmployeeInfo = mongoose.model('NewEmployeeInfo', newEmployeeInfoSchema);
const ConfirmedEmployee = mongoose.model('ConfirmedEmployee', confirmedEmployeeSchema);
const Employee = mongoose.model('Employee', employeeSchema);
const Service = mongoose.model('Service', serviceSchema);
const Commission = mongoose.model('Commission', commissionSchema);
const NewCommission = mongoose.model('NewCommission', newCommissionSchema);
const Payment = mongoose.model('Payment', paymentSchema);
const FinalPayment = mongoose.model('FinalPayment', finalPaymentSchema);
const Admin = mongoose.model('Admin', adminSchema);

// Create Express app
const app = express();
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.get('/employees', async (req, res) => {
  try {
    const filters = {};
    
    // Apply filters based on query parameters
    
    const employees = await Employee.find(req.query);
    res.status(200).json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
    console.log(err.message);
  }
});

app.get('/employees/:email', async (req, res) => {
  try {
    const employee = await Employee.findOne({ "employeeInfo.email": req.params.email });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.status(200).json(employee);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/employees/:email', async (req, res) => {
  try {
    const employee = await Employee.findOne({ "employeeInfo.email": req.params.email });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    const email = employee.employeeInfo.email;
    const admin = await Admin.findOne({"email" : email});

    if (admin != null)
    {
      return res.status(401).json({ error: 'Cannot delete an admin' });
    }

    const deletedEmp = await Employee.findOneAndDelete({ "employeeInfo.email": req.params.email });
    const deletedConfEmp = await ConfirmedEmployee.findOneAndDelete({ "employeeInfo.email": req.params.email });

    res.status(200).json(deletedEmp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.post('/employees', async (req, res) => {
  const employee = new Employee(req.body);
  
  try {
    const newEmployee = await employee.save();
    const emp = await NewEmployeeInfo.findOneAndDelete({email: employee.employeeInfo.email});
    const confirmed = await ConfirmedEmployee(emp.toJSON());
    confirmed.save();
    res.status(201).json(newEmployee);
  } catch (err) {
    res.status(400).json({ message: err.message });
    console.log(err.message);
  }
});

app.put('/employees/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { employeeInfo, paymentInfo } = req.body;

    const updatedEmployee = await Employee.findOneAndUpdate(
      { "employeeInfo.email": email },
      { employeeInfo, paymentInfo },
      { new: true }
    );

    if (!updatedEmployee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.status(200).json(updatedEmployee);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

app.post('/new-employees', async (req, res) => {
  try {
    req.body.password = await bcrypt.hash(req.body.password, saltRounds);
    const savedInfo = await NewEmployeeInfo.create(req.body);
    res.status(201).json(savedInfo);
  } catch (err) {
    res.status(400).json({ message: err.message });
    console.log(err.message);
  }
});

app.get('/new-employees', async (req, res) => {
  try {
    const employees = await NewEmployeeInfo.find();
    const filteredEmployees = employees.map((employee) => {
      const { password, ...employeeWithoutPassword } = employee.toObject();
      return employeeWithoutPassword;
    });
    res.status(200).json(filteredEmployees);
  } catch (err) {
    res.status(500).json({ message: err.message });
    console.log(err.message);
  }
});

app.get('/email-used', async (req, res) => {
  try {
    const employee = await ConfirmedEmployee.find({email: req.query.email});
    if (employee.length == 0)
    {
      res.status(200).json({used: false})
    }
    else 
    {
      res.status(200).json({used: true})
    }
  } catch(err) {
    res.status(500).json({ message: err.message });
    console.log(err.message);
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const user = await ConfirmedEmployee.findOne({ email });

    // If user is not found, return an error
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Compare the provided password with the stored password hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    // If passwords don't match, return an error
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate a new session ID
    const sessionId = uuidv4();
    const employee = await Employee.findOne({"employeeInfo.email" : email})
    var identity = "employee";
    // Add the new session ID to the user's sessionIds array
    user.sessionIds.push(sessionId);
    
    // Save the updated user document
    await user.save();

    const admin = await Admin.findOne({"email" : user.email});
    if (admin != null)
    {
      identity = "admin";
    }

    // Return the session ID to the client (e.g., in a cookie or as part of the response body)
    return res.status(200).json({ identity, sessionId, employee });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/login-session', async (req, res) => {
  try {
    const sessionId = req.body.sessionId;
    const email = req.body.email;

    const employee = await ConfirmedEmployee.findOne({email : email});
    if (employee == null)
      return res.status(401).json({ error: 'Invalid email' });
    
    const validId = employee.sessionIds.includes(sessionId);
    var identity = "failed";
    
    if (validId) {
      const admin = await Admin.findOne({email : email});
      const employeeData = await Employee.findOne({"employeeInfo.email" : email});
      if (admin != null)
      {
        identity = "admin";
      }
      else if (employeeData != null) {
        identity = "employee";
      }
      res.status(200).json({ employee: employeeData, identity });
    }
    else {
      return res.status(401).json({ error: 'Invalid sessionId' });
    }

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/services', async (req, res) => {
  try {
    const services = await Service.find();
    res.status(200).json(services);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve services' });
  }
});

// Get a specific service by name
app.get('/services/:name', async (req, res) => {
  try {
    const service = await Service.findOne({ name: req.params.name });
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(200).json(service);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve service' });
  }
});

app.delete('/services/:name', async (req, res) => {
  try {
    const service = await Service.findOneAndDelete({ name: req.params.name });
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(200).json(service);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete service' });
  }
});


app.post('/services', async (req, res) => {
  try {
    const { name, commercialPay, commissions } = req.body;
    const newService = new Service({
      name,
      commercialPay,
      commissions,
    });
    const savedService = await newService.save();
    res.status(201).json(savedService);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create service' });
  }
});


app.put('/services/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { newName, commercialPay, commissions } = req.body;

    const updatedService = await Service.findOneAndUpdate(
      { name },
      { name : newName, commercialPay, commissions },
      { new: true }
    );

    if (!updatedService) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.status(200).json(updatedService);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// Helper function to build query from query parameters
const buildQuery = (queryParams) => {
  const query = {};

  if (queryParams.employee) {
    query.employee = queryParams.employee;
  }

  if (queryParams.status) {
    if (Array.isArray(queryParams.status)) {
      query.status = { $in: queryParams.status };
    } else {
      query.status = queryParams.status;
    }
  }

  if (queryParams.dateFrom) {
    query.date = query.date || {};
    query.date.$gte = new Date(queryParams.dateFrom);
  }

  if (queryParams.dateTo) {
    query.date = query.date || {};
    query.date.$lte = new Date(queryParams.dateTo);
  }

  // Add any additional query parameters to the query object
  Object.entries(queryParams).forEach(([key, value]) => {
    if (!['employee', 'status', 'dateFrom', 'dateTo'].includes(key)) {
      query[key] = value;
    }
  });

  return query;
};


app.post('/new-commissions', async (req, res) => {
  const newCommission = new NewCommission(req.body);

  try {
    const savedCommission = await newCommission.save();
    res.status(201).json(savedCommission);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.post('/commissions', async (req, res) => {
  const commission = new Commission(req.body);
  //console.log(req.body);
  try {
    const savedCommission = await commission.save();
    res.status(201).json(savedCommission);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});


// Routes for NewCommissions
app.get('/new-commissions', async (req, res) => {
  try {
    const query = buildQuery(req.query);
    const newCommissions = await NewCommission.find(query);
    res.json(newCommissions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ... (Other routes remain the same)

// Routes for Commissions
app.get('/commissions', async (req, res) => {
  try {
    const query = buildQuery(req.query);
    const commissions = await Commission.find(query);
    res.json(commissions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/new-commissions', async (req, res) => {
  try {
    const query = buildQuery(req.query);
    const updatedCommission = await NewCommission.findOneAndUpdate(query, req.body, { new: true });
    if (!updatedCommission) {
      return res.status(404).json({ message: 'New Commission not found' });
    }
    res.json(updatedCommission);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/commissions', async (req, res) => {
  try {
    const query = buildQuery(req.query);
    const updatedCommission = await Commission.findOneAndUpdate(query, req.body, { new: true });
    if (!updatedCommission) {
      return res.status(404).json({ message: 'Commission not found' });
    }
    res.json(updatedCommission);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.get('/project-name-used', async (req, res) => {
  try {
    const employee = await ConfirmedEmployee.find({email: req.query.email});
    if (employee.employeeInfo.service == "Commercial")
    {
      const commissions = NewCommission.find({"employee" : employee.email, "project.name" : req.query.name})
      if (commissions.length == 0)
        res.status(200).json({used : false})
      else
        res.status(200).json({used : true})
    }
    else
    {
      const commissions = Commission.find({"employee" : employee.email, "project.name" : req.query.name})
      if (commissions.length == 0)
        res.status(200).json({used : false})
      else
        res.status(200).json({used : true})
    }
    
  } catch(err) {
    res.status(500).json({ message: err.message });
    console.log(err.message);
  }
});

const buildPaymentQuery = (queryParams) => {
  const query = {};

  if (queryParams.employee) {
    query.employee = queryParams.employee;
  }

  if (queryParams.dateFrom) {
    query.date = query.date || {};
    query.date.$gte = new Date(queryParams.dateFrom);
  }

  if (queryParams.dateTo) {
    query.date = query.date || {};
    query.date.$lte = new Date(queryParams.dateTo);
  }

  // Add any additional query parameters to the query object
  Object.entries(queryParams).forEach(([key, value]) => {
    if (!['employee', 'dateFrom', 'dateTo'].includes(key)) {
      query[key] = value;
    }
  });

  return query;
};

app.get('/payments', async (req, res) => {
  try {
    const query = buildPaymentQuery(req.query);
    const payments = await Payment.find(query);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/payments', async (req, res) => {
  const payment = new Payment(req.body);
  try {
    const savedPayment = await payment.save();
    res.status(201).json(savedPayment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Routes for FinalPayments
app.get('/final-payments', async (req, res) => {
  try {
    const query = buildPaymentQuery(req.query);
    const finalPayments = await FinalPayment.find(query);
    res.json(finalPayments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/final-payments', async (req, res) => {
  const finalPayment = new FinalPayment(req.body);
  try {
    const employee = await Employee.findOne({"employeeInfo.email" : finalPayment.employee});
    if (employee.employeeInfo.service == "Commercial") {
      const commissions = await NewCommission.find({"employee" : employee.employeeInfo.email, "status" : "notPayed"});
      for (const com of commissions)
      {
        com.status = "payed";
        com.save();
      }
    } 

    else {
      const commissisons = await Commission.find({"employee" : employee.employeeInfo.email, "status" : "notPayed"});
      for (const com of commissisons)
      {
        com.status = "payed";
        com.save();
      }
    }

    employee.paymentInfo.absence = 0;
    await employee.save();
    const savedFinalPayment = await finalPayment.save();
    res.status(201).json(savedFinalPayment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.get('/last-final-payment', async (req, res) => {
  try {
    const query = buildQuery(req.query);
    const finalPayments = await FinalPayment.find(query).sort({ date: -1 }).limit(1);
    res.json(finalPayments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Start server
app.listen(3000, () => {
  console.log('Server started on port 3000');
});

