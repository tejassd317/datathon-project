import React, { useState } from 'react';
import { MapPin, Navigation, Snowflake, AlertTriangle, ShieldCheck, Check } from 'lucide-react';

export function NetworkMap({ facilities, routes, inventory, onSelectFacility, selectedFacilityId }) {
  const [hoveredFacility, setHoveredFacility] = useState(null);
  const [hoveredRoute, setHoveredRoute] = useState(null);

  // Geographic bounds to project lat/lng onto an SVG canvas of 800 x 480
  // Lat range: ~0.00 to ~1.20 (North is up, so Y is inverted)
  // Lng range: ~35.40 to ~36.15
  const minLat = 0.00;
  const maxLat = 1.20;
  const minLng = 35.40;
  const maxLng = 36.15;

  const projectCoord = (lat, lng) => {
    const x = 70 + ((lng - minLng) / (maxLng - minLng)) * 660;
    const y = 430 - ((lat - minLat) / (maxLat - minLat)) * 380;
    return { x, y };
  };

  // Group inventory by facility to determine risk severity badge
  const facilityStatusMap = new Map();
  facilities.forEach(fac => {
    const items = inventory.filter(i => i.facilityId === fac.id);
    const hasCritical = items.some(i => i.riskTier === 'CRITICAL');
    const hasHigh = items.some(i => i.riskTier === 'HIGH');
    facilityStatusMap.set(fac.id, {
      hasCritical,
      hasHigh,
      status: hasCritical ? 'CRITICAL' : hasHigh ? 'HIGH' : 'NORMAL',
      itemCount: items.length
    });
  });

  return (
    <div className="card-panel">
      <div className="panel-header">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="panel-title">Vulnerable Rural Supply Chain Topology Map</h2>
            <span className="badge-geo">Geospatial Routing Model</span>
          </div>
          <p className="panel-subtitle">
            Physical topology connecting central distribution depot to remote dispensaries and riverine care posts. Click node to filter inventory.
          </p>
        </div>

        {/* Legend */}
        <div className="map-legend">
          <div className="legend-item">
            <span className="legend-line line-passable"></span> Passable Road
          </div>
          <div className="legend-item">
            <span className="legend-line line-blocked"></span> Blocked / Disrupted Road
          </div>
          <div className="legend-item">
            <span className="legend-line line-cold"></span> Cold-Chain Transit
          </div>
          <div className="legend-item">
            <span className="legend-dot dot-critical"></span> Critical Stockout
          </div>
        </div>
      </div>

      <div className="map-canvas-container">
        <svg viewBox="0 0 800 460" className="network-svg">
          <defs>
            {/* Grid pattern */}
            <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" strokeWidth="1" />
            </pattern>
            {/* Escarpment terrain styling */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background grid */}
          <rect width="800" height="460" fill="url(#gridPattern)" />

          {/* District boundary decorative contours */}
          <path 
            d="M 120,400 Q 200,320 280,360 T 450,280 T 620,180 T 700,60" 
            fill="none" 
            stroke="#e2e8f0" 
            strokeWidth="1.5" 
            strokeDasharray="6 6"
          />
          <text x="630" y="50" fill="#94a3b8" fontSize="10" fontStyle="italic">East Pokot Northern Drylands</text>
          <text x="80" y="440" fill="#94a3b8" fontSize="10" fontStyle="italic">Rift Escarpment Supply Corridor</text>

          {/* Render Transit Routes */}
          {routes.map(r => {
            const fromFac = facilities.find(f => f.id === r.fromFacilityId);
            const toFac = facilities.find(f => f.id === r.toFacilityId);
            if (!fromFac || !toFac) return null;

            const p1 = projectCoord(fromFac.location.lat, fromFac.location.lng);
            const p2 = projectCoord(toFac.location.lat, toFac.location.lng);

            const isBlocked = !r.isPassable;
            const hasCold = r.hasColdChainVehicleSupport;
            const isHovered = hoveredRoute?.routeId === r.routeId;

            // Route color
            let strokeColor = '#059669'; // default passable green
            if (isBlocked) strokeColor = '#ef4444'; // blocked red
            else if (hasCold) strokeColor = '#0284c7'; // cold blue

            return (
              <g 
                key={r.routeId} 
                className="route-group cursor-pointer"
                onMouseEnter={() => setHoveredRoute(r)}
                onMouseLeave={() => setHoveredRoute(null)}
              >
                {/* Thick invisible click area */}
                <line 
                  x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} 
                  stroke="transparent" 
                  strokeWidth="14" 
                />
                {/* Visual road line */}
                <line 
                  x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} 
                  stroke={strokeColor} 
                  strokeWidth={isHovered ? 4 : (isBlocked ? 3.5 : 2.5)} 
                  strokeDasharray={isBlocked ? "8 6" : hasCold ? "4 2" : "none"}
                  className={isBlocked ? 'route-blocked-pulse' : ''}
                />

                {/* Midpoint distance pill */}
                <g transform={`translate(${(p1.x + p2.x) / 2}, ${(p1.y + p2.y) / 2})`}>
                  <rect 
                    x="-24" y="-10" width="48" height="20" rx="4" 
                    fill="#ffffff" 
                    stroke={strokeColor} 
                    strokeWidth="1"
                    className="shadow-sm"
                  />
                  <text 
                    x="0" y="4" 
                    textAnchor="middle" 
                    fontSize="9.5" 
                    fontWeight="600" 
                    fill="#334155"
                  >
                    {r.distanceKm}km
                  </text>
                </g>
              </g>
            );
          })}

          {/* Render Facility Nodes */}
          {facilities.map(fac => {
            const pt = projectCoord(fac.location.lat, fac.location.lng);
            const statusInfo = facilityStatusMap.get(fac.id) || { status: 'NORMAL' };
            const isSelected = selectedFacilityId === fac.id;
            const isHovered = hoveredFacility?.id === fac.id;
            const isHub = fac.id === 'FAC-004';

            let nodeFill = '#10b981';
            if (statusInfo.status === 'CRITICAL') nodeFill = '#ef4444';
            else if (statusInfo.status === 'HIGH') nodeFill = '#f59e0b';

            return (
              <g 
                key={fac.id} 
                transform={`translate(${pt.x}, ${pt.y})`}
                onClick={() => onSelectFacility(isSelected ? null : fac.id)}
                onMouseEnter={() => setHoveredFacility(fac)}
                onMouseLeave={() => setHoveredFacility(null)}
                className="facility-node-group cursor-pointer"
              >
                {/* Selection ring */}
                {isSelected && (
                  <circle r={isHub ? 26 : 22} fill="none" stroke="#0284c7" strokeWidth="3" strokeDasharray="3 3" />
                )}

                {/* Node Outer Circle */}
                <circle 
                  r={isHub ? 20 : 16} 
                  fill="#ffffff" 
                  stroke={nodeFill} 
                  strokeWidth="3.5"
                  className="facility-circle shadow-md"
                />

                {/* Node Inner Core */}
                <circle 
                  r={isHub ? 10 : 8} 
                  fill={nodeFill} 
                  className={statusInfo.status === 'CRITICAL' ? 'urgent-pulse' : ''}
                />

                {/* Cold chain indicator dot */}
                {fac.hasColdChain && (
                  <g transform="translate(10, -12)">
                    <circle r="7" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" />
                    <text x="0" y="3" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">❄</text>
                  </g>
                )}

                {/* Facility Name Label */}
                <text 
                  x="0" 
                  y={isHub ? 32 : 28} 
                  textAnchor="middle" 
                  fontSize="11.5" 
                  fontWeight={isSelected || isHovered ? "800" : "600"} 
                  fill="#0f172a"
                  className="node-label"
                >
                  {fac.name}
                </text>

                {/* Type Subtitle */}
                <text 
                  x="0" 
                  y={isHub ? 45 : 41} 
                  textAnchor="middle" 
                  fontSize="9.5" 
                  fill="#64748b"
                >
                  {fac.type.split('(')[0].trim()}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredFacility && (
          <div className="map-tooltip">
            <div className="font-bold text-sm text-slate-900">{hoveredFacility.name}</div>
            <div className="text-xs text-slate-600">{hoveredFacility.type} • {hoveredFacility.district}</div>
            <div className="text-xs mt-1 text-slate-700">
              Access: <em>{hoveredFacility.location?.accessibilityRating}</em>
            </div>
            <div className="text-xs text-sky-700 font-medium mt-0.5">
              Cold Chain: {hoveredFacility.coldChainStatus}
            </div>
          </div>
        )}

        {hoveredRoute && (
          <div className="map-tooltip">
            <div className="font-bold text-sm text-slate-900">{hoveredRoute.routeCode}</div>
            <div className="text-xs text-slate-600">
              Distance: {hoveredRoute.distanceKm} km (~{hoveredRoute.normalTransitHours}h transit)
            </div>
            <div className="text-xs mt-1">
              Status: <span className={hoveredRoute.isPassable ? 'text-emerald-700 font-semibold' : 'text-red font-bold'}>
                {hoveredRoute.isPassable ? 'PASSABLE' : 'BLOCKED / DISRUPTED'}
              </span>
            </div>
            <div className="text-xs text-slate-500">{hoveredRoute.notes}</div>
          </div>
        )}
      </div>
    </div>
  );
}
