# Digital Twin Builder

AI Private Cellular Planner – Phase 1: User Onboarding & Building Digital Twin

Objective

Design a modern enterprise SaaS web application for an AI-powered Private LTE / Private 5G Indoor Network Planning platform.

This is the first phase of the user journey, where the user uploads a building drawing and converts it into a validated digital building model (Digital Twin) before RF planning begins.

The design should look like a premium engineering software (mix of Autodesk Construction Cloud, Figma, Notion, ArcGIS, and modern AI products), not like a traditional website.

Use a clean, minimal, highly professional interface focused on engineering workflows.

Overall Design Language

Theme:

Modern SaaS

Enterprise-grade

AI-first

Minimal

Premium

Color Palette

Primary:

#2563EB

Success:

#16A34A

Warning:

#F59E0B

Danger:

#DC2626

Background:

#F8FAFC

Cards:

White

Border:

#E5E7EB

Text:

#111827

Secondary Text:

#6B7280

Radius:

16px

Soft shadows

300ms smooth animations

Responsive Design

Desktop first

Support:

Tablet

Mobile

Dashboard

After login, the user lands on a clean dashboard.

Top Navigation Bar

Left

Platform Logo

AI Private Cellular Planner

Center

Breadcrumb

Right

Notification

Profile

Settings

Main Content

Large Hero Card

Title

Welcome Back

Subtitle

Create or continue your Private Cellular Planning projects.

Below

Primary CTA

New Project

Below

Project List

If no projects exist:

Display Empty State Illustration

Message

"No projects yet."

Button

Create your first project

Left Sidebar

Navigation

Dashboard

Projects

Templates

Settings

Use modern outline icons.

Active page highlighted.

New Project Wizard

When the user clicks

New Project

Open a centered multi-step wizard.

Step Indicator

Step 1

Project Information

Step 2

Upload Drawing

Step 3

AI Analysis

Step 4

Review

Step 5

Ready

Step 1 — Project Information

Fields

Project Name

Placeholder

Factory A

Project Type

Radio Buttons

Private LTE

Private 5G

Auto Recommendation

Country

Searchable dropdown

Building Type

Selectable cards

Factory

Office

Hospital

Airport

Warehouse

University

Mall

Navigation

Back

Disabled

Next

Primary Button

Validation

Project Name required

Country required

Building Type required

Step 2 — Upload Drawing

Large Upload Area

Centered Card

Supported Formats

PDF

DWG

DXF

PNG

JPG

Drag & Drop

Browse Files

Upload Progress

Display upload percentage.

Display file size.

Display filename.

Allow multiple uploads.

If upload fails

Show retry button.

Step 3 — AI Analysis

After upload finishes

Automatically start AI processing.

Full-screen analysis interface.

Large Circular Progress

0%

↓

12%

↓

53%

↓

100%

Below progress

Live AI Tasks

Detect Walls

Detect Doors

Detect Windows

Detect Columns

Detect Rooms

Detect Labels

Scale Detection

Generate Digital Model

Each completed task gets

Green Check Icon

Current task

Animated AI icon

Estimated remaining time displayed.

Professional AI loading animation.

Step 4 — Compare Original vs AI Result

Split Screen Layout

Left

Original Drawing

Right

AI Result

Both canvases synchronized.

Zoom together.

Pan together.

Opacity comparison slider.

User can visually compare.

Buttons

Accept AI Result

Edit Result

Interactive Building Editor

If the user chooses Edit

Open a full professional CAD-style workspace.

No static images.

Everything is vector-based and editable.

Every object is selectable.

Canvas

Infinite workspace

Grid

Zoom

Pan

Snap

Coordinate system

Smooth rendering

Top Toolbar

Select

Move

Delete

Undo

Redo

Save

Measure

Zoom In

Zoom Out

Fit Screen

Keyboard Shortcuts

Ctrl+Z

Ctrl+Y

Delete

Ctrl+S

Mouse Wheel Zoom

Middle Mouse Pan

Left Toolbox

Add Wall

Add Door

Add Window

Add Column

Add Room

Measure Tool

Snap Toggle

Grid Toggle

Layers

Material Library

Icons only with labels.

Right Properties Panel

Dynamic.

Changes depending on selected object.

When Wall Selected

Wall ID

Length

Height

Thickness

Material

Material Dropdown

Concrete

Brick

Glass

Wood

Gypsum

Metal

Live Preview

When Room Selected

Room Name

Area

Usage

Usage Dropdown

Office

Meeting Room

Warehouse

Electrical Room

Server Room

Production

Storage

Hall

Room Color

Editable Label

When Window Selected

Width

Height

Material

Glass Type

Frame Type

When Door Selected

Width

Height

Material

Metal

Wood

Glass

Opening Direction

Layers Panel

Walls

Doors

Windows

Columns

Furniture

Labels

Electrical

HVAC

Visibility Toggle

Lock Layer

Opacity Slider

Materials Library

Search

Categories

Concrete

Brick

Metal

Glass

Wood

Gypsum

Custom Material

Material Properties

Density

Wall Loss

Thickness

Thermal Properties

Color Preview

Automatic Measurements

Every drawn object automatically calculates

Length

Area

Perimeter

Coordinates

Display dimensions live.

Scale Detection

If AI detects scale

Display

Scale Detected Successfully

If AI cannot detect scale

Launch Manual Scale Wizard

Instruction

Select two points.

Question

What is the real-world distance?

Example

20 meters

Automatically rescale the complete model.

Validation Engine

Before saving

Run automatic validation.

Checklist

Missing Wall

Open Room

Floating Door

Window Outside Wall

Overlapping Objects

Disconnected Room

Duplicate Wall

Invalid Scale

Each issue

Clickable

Zoom to Issue

Fix Suggestion

Green check after correction.

Save Project

Save

Not as an image.

Save as a Digital Building Model.

Store

Geometry

Objects

Materials

Measurements

Rooms

Layers

Metadata

AI Labels

Scale

Project History

Autosave every 30 seconds.

Manual Save available.

Version history supported.

Completion Screen

Large Success Animation

Green Check

Title

Building Digital Twin Created Successfully

Status

✓ Ready

Message

Your building is ready for RF Planning.

Primary Button

Start RF Planning

Secondary Button

Back to Dashboard

Complete User Flow

User

↓

Dashboard

↓

New Project

↓

Project Information

↓

Upload Drawing

↓

AI Analysis

↓

Digital Model Generation

↓

Original vs AI Comparison

↓

Interactive Building Editor

↓

Materials Assignment

↓

Validation Engine

↓

Save Digital Building

↓

Building Digital Twin Ready

↓

Ready for RF Planning

UX Principles

Minimize clicks while preserving engineering accuracy.

Every action should provide immediate visual feedback.

Use smooth transitions between wizard steps.

Support keyboard shortcuts for productivity.

Prevent destructive actions with confirmation dialogs.

Autosave in the background.

Maintain a clean, distraction-free interface focused on engineering workflows.

Ensure every engineering object is fully editable through both direct canvas interaction and the properties panel.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://build-iq-planner.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8f1b87b5-c5d5-4d37-8a2d-8b96f424e205).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
