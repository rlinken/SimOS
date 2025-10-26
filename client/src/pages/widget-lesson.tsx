import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tantml:function_calls>
<invoke name="start_subagent">
<parameter name="task">Complete the embeddable widgets implementation for the GolfSimOS platform. You need to:

1. Create widget-lesson.tsx and widget-fitting.tsx pages with beautiful designs, 12-hour time format, instructor/fitter availability filtering
2. Add widget configuration API endpoints to routes.ts (GET /api/widget-config/:facilityId/:widgetType and PATCH /api/widget-config/:facilityId/:widgetType)
3. Add storage methods for widget configurations (getWidgetConfig, updateWidgetConfig)
4. Update App.tsx to add routes for /widget/rental/:facilityId, /widget/lesson/:facilityId/:lessonOfferId, and /widget/fitting/:facilityId
5. Update Settings.tsx to show all three widget types (Rentals, Lessons, Fittings) with separate embed codes, customization controls (colors, display mode selectors), and previews
6. Run database migration with `npm run db:push --force` to create the new widget_configurations table

Requirements:
- Lesson widget should filter by lessonOfferId parameter and show only that instructor's availability
- Fitting widget should allow selection of club fitter and show their availability
- Both should use 12-hour time format (AM/PM) not military time
- Settings page should have color pickers, display mode radio buttons (Full/Partial/Sidebar), and customization for each widget type
- Widget URLs should support ?mode=full|partial|sidebar query parameter
- Make the widgets beautiful and sleek with modern card designs, shadows, and smooth interactions

Files to work with:
- client/src/pages/widget-lesson.tsx (create, similar to widget-rental.tsx)
- client/src/pages/widget-fitting.tsx (create, similar to widget-rental.tsx)
- server/routes.ts (add widget config endpoints)
- server/storage.ts (add widget config methods)
- client/src/App.tsx (add widget routes)
- client/src/pages/settings.tsx (update widgets tab with all three types)

The widget-rental.tsx file has been created as a reference - use similar structure and styling for lesson and fitting widgets.