
// ----------------------------------------------------
// Custom shader for dynamic body rendering + velocities 
// ----------------------------------------------------

export const BODY_VERTEX_SHADER = `
    attribute float mass;
    attribute vec3 velocity;
    
    uniform int uMode; // 0 = Research, 1 = Cosmos
    
    varying vec2 vUv;
    varying float vMass;
    varying vec3 vVelocity;
    
    void main() {
        vUv = uv;
        vMass = mass;
        vVelocity = velocity;
        
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        
        // Size proportional to mass but scaled by distance (perspective)
        float baseSize = 2.0; 
        
        if (uMode == 1) { // Cosmos - Larger, glowing center
             baseSize = 4.0 + log(mass); // Logarithmic mass mapping
        } else { // Research - Precise dot
             baseSize = 1.5; 
        }
        
        gl_PointSize = baseSize * (1500.0 / -mvPosition.z); // Scale by distance
    }
`;

export const BODY_FRAGMENT_SHADER = `
    uniform int uMode; // 0 = Research, 1 = Cosmos
    
    varying vec2 vUv;
    varying float vMass;
    
    void main() {
        // Compute distance from center of point
        vec2 fromCenter = gl_PointCoord - vec2(0.5);
        float dist = length(fromCenter);
        
        if (uMode == 0) { // Research Mode - Basic Dot
            if (dist > 0.5) discard;
            gl_FragColor = vec4(1.0, 1.0, 1.0, 0.9);
        } else { // Cosmos Mode - Glowing core
            // Radial falloff glow
            float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
            
            // Soft inner glow color depending roughly on mass / heat assumption
            vec3 coreColor = vec3(0.8, 0.9, 1.0); // Slight blue
            if (vMass > 50.0) coreColor = vec3(1.0, 0.8, 0.6); // slight yellow/orange for heavy
            
            // Push intensity > 1.0 to trigger UnrealBloomPass threshold
            vec3 bloomColor = coreColor * 2.5; 
            
            gl_FragColor = vec4(bloomColor, alpha);
        }
    }
`;
