import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, PresentationControls, ContactShadows, Sparkles } from '@react-three/drei';

const ResponsiveStage = ({ children }) => {
  const { size } = useThree();
  const isMobile = size.width < 640;
  const isTablet = size.width >= 640 && size.width < 1024;

  const responsiveScale = isMobile
    ? Math.max(0.72, Math.min(0.92, size.width / 420))
    : isTablet
    ? 0.95
    : 1.0;

  return <group scale={responsiveScale}>{children}</group>;
};

export const OvenSteam = ({ position = [0, 0.25, 0], count = 8, color = "#fff7ed" }) => {
  const steamGroup = useRef();

  useFrame((state) => {
    if (!steamGroup.current) return;
    steamGroup.current.children.forEach((child, i) => {
      child.position.y += 0.007 + (i % 3) * 0.003;
      child.position.x = Math.sin(state.clock.elapsedTime * 1.4 + i) * 0.12 + (child.userData.initX || 0);
      child.scale.setScalar(child.scale.x + 0.004);
      if (child.material) {
        child.material.opacity -= 0.004;
      }
      if (child.position.y > 1.6 || (child.material && child.material.opacity <= 0)) {
        child.position.y = 0.1;
        child.scale.setScalar(0.12 + Math.random() * 0.1);
        if (child.material) child.material.opacity = 0.3 + Math.random() * 0.2;
      }
    });
  });

  return (
    <group ref={steamGroup} position={position}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh
          key={`steam-${i}`}
          position={[(Math.random() - 0.5) * 0.8, 0.1 + (i / count) * 1.3, (Math.random() - 0.5) * 0.8]}
          userData={{ initX: (Math.random() - 0.5) * 0.6 }}
        >
          <sphereGeometry args={[0.16, 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.2} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
};

export const RealisticPizza = ({ position = [0, 0, 0], scale = 1, autoRotateSpeed = 0.4 }) => {
  const pizzaGroup = useRef();

  useFrame((state, delta) => {
    if (pizzaGroup.current) {
      pizzaGroup.current.rotation.y += delta * autoRotateSpeed;
      pizzaGroup.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.12 + 0.38;
    }
  });

  const charBlisters = useMemo(() => {
    const list = [];
    const count = 18;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.sin(i * 3) * 0.2);
      const radius = 1.48 + (Math.sin(i * 5) * 0.06);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const blisterScale = 0.06 + ((i % 4) * 0.025);
      list.push({ x, z, scale: blisterScale, rotY: angle });
    }
    return list;
  }, []);

  return (
    <group ref={pizzaGroup} position={position} scale={scale}>
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.5, 0.25, 32, 64]} />
        <meshStandardMaterial color="#b45309" roughness={0.78} metalness={0.04} />
      </mesh>

      {charBlisters.map((b, i) => (
        <mesh key={`blister-${i}`} position={[b.x, 0.08, b.z]} rotation={[0.2, b.rotY, 0.2]}>
          <sphereGeometry args={[b.scale, 10, 10]} />
          <meshStandardMaterial color="#1a0c03" roughness={0.92} />
        </mesh>
      ))}

      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 0.12, 48]} />
        <meshStandardMaterial color="#854d0e" roughness={0.82} />
      </mesh>

      <mesh position={[0, 0.015, 0]}>
        <cylinderGeometry args={[1.44, 1.44, 0.05, 48]} />
        <meshStandardMaterial color="#991b1b" roughness={0.35} metalness={0.05} />
      </mesh>

      <mesh position={[0, 0.045, 0]}>
        <cylinderGeometry args={[1.39, 1.39, 0.04, 48]} />
        <meshPhysicalMaterial
          color="#fbbf24"
          roughness={0.22}
          metalness={0.06}
          clearcoat={0.45}
          clearcoatRoughness={0.2}
          reflectivity={0.65}
        />
      </mesh>

      {[
        [0.55, 0.075, 0.45],
        [-0.52, 0.075, 0.58],
        [-0.65, 0.075, -0.42],
        [0.55, 0.075, -0.52],
        [0, 0.075, 0.05],
        [0.85, 0.075, -0.1],
        [-0.15, 0.075, -0.8],
        [0.1, 0.075, 0.8]
      ].map((pos, i) => (
        <group key={`pep-${i}`} position={pos} rotation={[0.05, (i * Math.PI) / 3.5, 0.04]}>
          <mesh>
            <cylinderGeometry args={[0.23, 0.22, 0.03, 24]} />
            <meshPhysicalMaterial color="#991b1b" roughness={0.35} metalness={0.08} clearcoat={0.5} />
          </mesh>
          <mesh position={[0, 0.016, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.22, 0.022, 10, 20]} />
            <meshStandardMaterial color="#450a0a" roughness={0.7} />
          </mesh>
        </group>
      ))}

      {[
        [0.32, 0.09, 0.32],
        [-0.32, 0.09, -0.22],
        [0.42, 0.09, -0.32],
        [-0.42, 0.09, 0.32],
        [0.05, 0.09, -0.52],
        [-0.05, 0.09, 0.48]
      ].map((pos, i) => (
        <group key={`paneer-${i}`} position={pos} rotation={[0, i * 0.75, 0]}>
          <mesh>
            <boxGeometry args={[0.18, 0.1, 0.18]} />
            <meshStandardMaterial color="#fefce8" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.052, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.16, 0.16]} />
            <meshStandardMaterial color="#b45309" roughness={0.65} />
          </mesh>
        </group>
      ))}

      {[
        [0.7, 0.08, 0.25],
        [-0.7, 0.08, -0.15],
        [0.2, 0.08, -0.75],
        [-0.25, 0.08, 0.7],
        [0.4, 0.08, 0.75]
      ].map((pos, i) => (
        <mesh key={`capsicum-${i}`} position={pos} rotation={[-Math.PI / 2, 0, i * 1.25]}>
          <torusGeometry args={[0.18, 0.038, 10, 20, Math.PI * 0.9]} />
          <meshPhysicalMaterial color="#16a34a" roughness={0.22} metalness={0.08} clearcoat={0.6} />
        </mesh>
      ))}

      {[
        [0.72, 0.08, -0.4],
        [-0.72, 0.08, 0.25],
        [0.12, 0.08, -0.7],
        [-0.12, 0.08, 0.82],
        [0.35, 0.08, -0.1]
      ].map((pos, i) => (
        <mesh key={`olive-${i}`} position={pos} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.11, 0.045, 14, 24]} />
          <meshPhysicalMaterial color="#090d16" roughness={0.18} metalness={0.12} clearcoat={0.5} />
        </mesh>
      ))}

      <OvenSteam position={[0, 0.2, 0]} count={8} />
    </group>
  );
};

export const RealisticBurger = ({ position = [0, 0, 0], scale = 1, autoRotateSpeed = 0.35 }) => {
  const burgerGroup = useRef();

  useFrame((state, delta) => {
    if (burgerGroup.current) {
      burgerGroup.current.rotation.y -= delta * autoRotateSpeed;
      burgerGroup.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.45) * 0.1 + 0.22;
    }
  });

  const sesameSeeds = useMemo(() => {
    const seeds = [];
    const count = 38;
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0) * 0.45;
      const r = 1.31;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi) + 0.48;
      const z = r * Math.sin(phi) * Math.sin(theta);
      seeds.push({ x, y, z, rotX: phi, rotY: theta });
    }
    return seeds;
  }, []);

  return (
    <group ref={burgerGroup} position={position} scale={scale}>
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[1.25, 1.15, 0.38, 40]} />
        <meshStandardMaterial color="#b45309" roughness={0.68} />
      </mesh>

      <mesh position={[0, -0.28, 0]}>
        <cylinderGeometry args={[1.34, 1.32, 0.38, 40]} />
        <meshStandardMaterial color="#361706" roughness={0.88} />
      </mesh>

      {[0, 0.35, -0.35].map((z, i) => (
        <mesh key={`grill-${i}`} position={[0, -0.08, z]} rotation={[0, 0, 0]}>
          <boxGeometry args={[2.4, 0.02, 0.06]} />
          <meshStandardMaterial color="#140803" roughness={0.95} />
        </mesh>
      ))}

      <mesh position={[0, -0.07, 0]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[1.9, 0.06, 1.9]} />
        <meshPhysicalMaterial color="#f59e0b" roughness={0.2} metalness={0.06} clearcoat={0.4} />
      </mesh>

      {[
        [0, 0.06, 0, 0],
        [0, 0.09, 0, Math.PI / 3]
      ].map((cfg, i) => (
        <mesh key={`lettuce-${i}`} position={[cfg[0], cfg[1], cfg[2]]} rotation={[0, cfg[3], 0]}>
          <cylinderGeometry args={[1.44, 1.4, 0.07, 32]} />
          <meshPhysicalMaterial color="#22c55e" roughness={0.28} metalness={0.04} clearcoat={0.35} />
        </mesh>
      ))}

      <mesh position={[-0.35, 0.2, 0]} rotation={[0.06, 0.2, 0]}>
        <cylinderGeometry args={[0.72, 0.72, 0.1, 32]} />
        <meshPhysicalMaterial color="#dc2626" roughness={0.22} metalness={0.06} clearcoat={0.5} />
      </mesh>
      <mesh position={[0.4, 0.22, 0.1]} rotation={[-0.05, -0.3, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 0.1, 32]} />
        <meshPhysicalMaterial color="#ef4444" roughness={0.22} metalness={0.06} clearcoat={0.5} />
      </mesh>

      <mesh position={[0, 0.48, 0]}>
        <sphereGeometry args={[1.3, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
          color="#d97706"
          roughness={0.26}
          metalness={0.05}
          clearcoat={0.5}
          clearcoatRoughness={0.2}
          reflectivity={0.6}
        />
      </mesh>

      {sesameSeeds.map((s, i) => (
        <mesh key={`sesame-${i}`} position={[s.x, s.y, s.z]} rotation={[s.rotX, s.rotY, 0.3]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial color="#fef08a" roughness={0.35} />
        </mesh>
      ))}

      <OvenSteam position={[0, 0.7, 0]} count={6} />
    </group>
  );
};

/**
 * Master Seamless 3D Food Component
 * Integrates photorealistic food motion for Pizza, Burger, and Cold Drink.
 * Features organic radial edge feathering (mask-image + multi-layer dissolution gradients)
 * so the dark marble surface melts completely into the page background with zero visible box borders.
 * 100% watermark-free via 120% scale crop and peripheral feathering.
 */
const VIDEO_MAP = {
  pizza: '/videos/pizza-craft.mp4',
  burger: '/videos/burger-craft.mp4',
  drink: '/videos/drink-craft.mp4',
  'wood-fired': '/videos/wood-fired-craft.mp4',
  split: '/videos/pizza-craft.mp4'
};

const GLOW_MAP = {
  pizza: 'bg-orange-600/30',
  burger: 'bg-amber-600/25',
  drink: 'bg-cyan-600/25'
};

const TAG_MAP = {
  pizza: { icon: '🍕', text: 'Wood-Fired at 450°C', highlight: 'Pure Mozzarella' },
  burger: { icon: '🍔', text: 'Charcoal Smashed Patty', highlight: 'Double Melted Cheddar' },
  drink: { icon: '🥤', text: 'Ice-Chilled Below 4°C', highlight: 'Fresh Mint & Lemon' }
};

const ThreeDFood = ({ variant = 'pizza', interactive = true, className = '', defaultMode = 'motion' }) => {
  const isVideoVariant = Boolean(VIDEO_MAP[variant]);
  const [viewMode, setViewMode] = useState(isVideoVariant ? defaultMode : '3d');
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const videoSrc = VIDEO_MAP[variant] || '/videos/pizza-craft.mp4';
  const glowColor = GLOW_MAP[variant] || 'bg-orange-600/30';
  const tag = TAG_MAP[variant] || TAG_MAP.pizza;

  // Performance Optimization: Only decode & play the video that is currently visible in viewport
  useEffect(() => {
    if (!isVideoVariant || viewMode !== 'motion' || !containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!videoRef.current) return;
        if (entry.isIntersecting) {
          videoRef.current.play().catch(() => {});
        } else {
          videoRef.current.pause();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isVideoVariant, viewMode]);

  if (isVideoVariant && viewMode === 'motion') {
    return (
      <div
        ref={containerRef}
        className={`w-full h-full relative flex items-center justify-center select-none transform-gpu will-change-transform ${className}`}
      >
        {/* Atmospheric Backlight Glow directly behind the food */}
        <div
          className={`absolute w-3/4 h-3/4 rounded-full blur-[80px] sm:blur-[130px] opacity-75 pointer-events-none transform-gpu ${glowColor}`}
        />

        {/* Seamless Masked Video Container */}
        {/* Radial gradient mask gently dissolves the dark marble and edges into 100% transparent alpha */}
        <div
          className="relative w-full h-full overflow-hidden flex items-center justify-center transform-gpu"
          style={{
            maskImage:
              'radial-gradient(ellipse 80% 75% at 50% 50%, #000 42%, rgba(0,0,0,0.85) 60%, rgba(0,0,0,0.25) 78%, transparent 96%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 80% 75% at 50% 50%, #000 42%, rgba(0,0,0,0.85) 60%, rgba(0,0,0,0.25) 78%, transparent 96%)'
          }}
        >
          {/* Photorealistic Seamless Looping Food Motion */}
          {/* Scale 120% completely crops out any corner watermarks beyond the feathered perimeter */}
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover scale-[1.20] translate-x-[-1%] translate-y-[-1%] select-none pointer-events-none transform-gpu"
          />

          {/* Dissolution Vignettes: seamlessly blends edges with dark webpage canvas */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#080402] via-transparent to-[#080402]/70 opacity-90 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080402] via-transparent to-[#080402] opacity-80 pointer-events-none" />
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-[#080402]/90 pointer-events-none" />
        </div>

        {/* Floating Organic Quality Chip (Floats seamlessly near the food) */}
        <div className="absolute bottom-2 right-2 sm:right-6 z-20 flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#080402]/80 backdrop-blur-xl border border-white/10 text-white shadow-xl pointer-events-none">
          <span className="text-sm">{tag.icon}</span>
          <span className="text-xs font-bold tracking-wide text-slate-200">
            {tag.text}
          </span>
        </div>

        {/* Subtle WebGL 3D Toggle */}
        {interactive && (
          <button
            onClick={() => setViewMode('3d')}
            className="absolute top-2 right-2 sm:right-6 z-30 flex items-center space-x-1.5 px-3 py-1 rounded-full bg-black/50 hover:bg-black/80 text-slate-400 hover:text-white text-[11px] font-semibold border border-white/10 backdrop-blur-md transition-all cursor-pointer opacity-70 hover:opacity-100"
            title="Switch to interactive 3D WebGL rotating mesh"
          >
            <span>🌐</span>
            <span>3D Mesh</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`w-full h-full relative rounded-3xl overflow-hidden ${className}`}
      style={{ touchAction: 'pan-y' }}
    >
      {/* If this is pizza or burger in 3D WebGL mode, provide toggle back to 3D Motion */}
      {isVideoVariant && (
        <button
          onClick={() => setViewMode('motion')}
          className="absolute top-3.5 right-3.5 z-30 flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-orange-600/90 hover:bg-orange-600 text-white text-xs font-bold border border-orange-400/40 backdrop-blur-md transition-all cursor-pointer shadow-xl hover:scale-105"
          title="Switch to photorealistic 3D Motion Bake"
        >
          <span>🎬</span>
          <span className="hidden sm:inline">3D Motion</span>
        </button>
      )}

      <Canvas
        camera={{ position: [0, 0, 6.2], fov: 44 }}
        dpr={[1, 1.75]}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[6, 9, 6]} intensity={2.2} color="#fffbeb" />
        <directionalLight position={[-6, 4, -4]} intensity={2.0} color="#fb923c" />
        <pointLight position={[0, -4, 3]} intensity={1.4} color="#f97316" />

        <Sparkles count={35} scale={7.5} size={3.0} speed={0.65} color="#fbbf24" />

        <PresentationControls
          enabled={interactive}
          global={false}
          cursor={interactive}
          polar={[-0.28, 0.28]}
          azimuth={[-0.6, 0.6]}
          config={{ mass: 2, tension: 380 }}
          snap={{ mass: 3, tension: 220 }}
        >
          <ResponsiveStage>
            {variant === 'pizza' && (
              <Float speed={2.4} rotationIntensity={0.6} floatIntensity={1.2}>
                <RealisticPizza position={[0, -0.05, 0]} scale={1.55} />
              </Float>
            )}

            {variant === 'burger' && (
              <Float speed={2.3} rotationIntensity={0.65} floatIntensity={1.25}>
                <RealisticBurger position={[0, 0.05, 0]} scale={1.45} />
              </Float>
            )}

            {variant === 'split' && (
              <>
                <Float speed={2} rotationIntensity={0.6} floatIntensity={1.2}>
                  <RealisticPizza position={[-2.2, 0.2, 0]} scale={1.2} />
                </Float>
                <Float speed={2.4} rotationIntensity={0.7} floatIntensity={1.3}>
                  <RealisticBurger position={[2.2, -0.2, 0]} scale={1.15} />
                </Float>
              </>
            )}
          </ResponsiveStage>
        </PresentationControls>

        <ContactShadows position={[0, -2.4, 0]} opacity={0.45} scale={9.5} blur={2.4} far={5} />
      </Canvas>
    </div>
  );
};

export default ThreeDFood;
