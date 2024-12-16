require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const wellknown = require("wellknown"); // For parsing WKT to GeoJSON

const app = express();
app.use(bodyParser.json());

// Load environment variables
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// Mongoose Schemas
const pointSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: { type: [Number], required: true },
  },
});
pointSchema.index({ location: "2dsphere" });

const polygonSchema = new mongoose.Schema({
  name: { type: String, required: true },
  area: {
    type: { type: String, enum: ["Polygon"], required: true },
    coordinates: { type: [[[Number]]], required: true },
  },
});
polygonSchema.index({ area: "2dsphere" });

const Point = mongoose.model("Point", pointSchema);
const Polygon = mongoose.model("Polygon", polygonSchema);


// API Endpoints

// Create a new point
app.post("/points", async (req, res) => {
  const { name, latitude, longitude } = req.body;
  if (!name || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "Missing required data for point" });
  }

  try {
    const point = new Point({
      name,
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
    });
    await point.save();
    res.status(201).json({ message: "Point added successfully", point });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add point" });
  }
});

// Create a new polygon
app.post("/polygons", async (req, res) => {
  const { name, polygon_wkt } = req.body;
  if (!name || !polygon_wkt) {
    return res.status(400).json({ error: "Missing required data for polygon" });
  }

  try {
    const geoJSON = wellknown(polygon_wkt); // Convert WKT to GeoJSON
    if (!geoJSON || geoJSON.type !== "Polygon") {
      return res.status(400).json({ error: "Invalid WKT for polygon" });
    }

    const polygon = new Polygon({
      name,
      area: geoJSON,
    });
    await polygon.save();
    res.status(201).json({ message: "Polygon added successfully", polygon });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add polygon" });
  }
});

// Update an existing point
app.put("/points", async (req, res) => {
  const { id, name, latitude, longitude } = req.body;
  if (!id || !name || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "Missing required data for point" });
  }

  try {
    const point = await Point.findByIdAndUpdate(
      id,
      {
        name,
        location: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
      },
      { new: true }
    );
    if (!point) return res.status(404).json({ error: "Point not found" });
    res.json({ message: "Point updated successfully", point });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update point" });
  }
});

// Update an existing polygon
app.put("/polygons", async (req, res) => {
  const { id, name, polygon_wkt } = req.body;
  if (!id || !name || !polygon_wkt) {
    return res.status(400).json({ error: "Missing required data for polygon" });
  }

  try {
    const geoJSON = wellknown(polygon_wkt); // Convert WKT to GeoJSON
    if (!geoJSON || geoJSON.type !== "Polygon") {
      return res.status(400).json({ error: "Invalid WKT for polygon" });
    }

    const polygon = await Polygon.findByIdAndUpdate(
      id,
      {
        name,
        area: geoJSON,
      },
      { new: true }
    );
    if (!polygon) return res.status(404).json({ error: "Polygon not found" });
    res.json({ message: "Polygon updated successfully", polygon });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update polygon" });
  }
});
// Get all points
app.get("/points", async (req, res) => {
    try {
      const points = await Point.find(); // Get all points
      res.json(points);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch points" });
    }
  });
// Get all polygons
app.get("/polygons", async (req, res) => {
    try {
      const polygons = await Polygon.find(); // Get all polygons
      res.json(polygons);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch polygons" });
    }
  });
    
// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`);
  });
