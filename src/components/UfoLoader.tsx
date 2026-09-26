import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface Props {
  className?: string;
}

export const UfoLoader: React.FC<Props> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [threeFailed, setThreeFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let ufoGroup: THREE.Group;
    let animId: number;
    let lights: THREE.Mesh[] = [];

    try {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(42, 150 / 130, 0.1, 100);
      camera.position.set(0, 0.4, 5.4);

      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setSize(150, 130, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      scene.add(new THREE.AmbientLight(0x6677ff, 0.6));
      const keyLight = new THREE.PointLight(0x38bdf8, 2.4, 14);
      keyLight.position.set(2.2, 3, 3);
      scene.add(keyLight);

      const rimLight = new THREE.PointLight(0xc084fc, 1.8, 14);
      rimLight.position.set(-3, 1, -2);
      scene.add(rimLight);

      ufoGroup = new THREE.Group();

      // Hull lathe
      const pts = [
        new THREE.Vector2(0.0, -0.10),
        new THREE.Vector2(0.35, -0.16),
        new THREE.Vector2(0.85, -0.14),
        new THREE.Vector2(1.15, -0.06),
        new THREE.Vector2(1.55, -0.03),
        new THREE.Vector2(1.72, 0.04),
        new THREE.Vector2(1.55, 0.11),
        new THREE.Vector2(1.15, 0.14),
        new THREE.Vector2(0.85, 0.19),
        new THREE.Vector2(0.35, 0.20),
        new THREE.Vector2(0.0, 0.14)
      ];
      const hullGeo = new THREE.LatheGeometry(pts, 48);
      const hullMat = new THREE.MeshStandardMaterial({
        color: 0x8b7ff0,
        metalness: 0.75,
        roughness: 0.22,
        emissive: 0x2a1364,
        emissiveIntensity: 0.3
      });
      ufoGroup.add(new THREE.Mesh(hullGeo, hullMat));

      // Dome
      const domeGeo = new THREE.SphereGeometry(0.78, 28, 20, 0, Math.PI * 2, 0, Math.PI / 2);
      const domeMat = new THREE.MeshPhysicalMaterial({
        color: 0x9be8ff,
        transparent: true,
        opacity: 0.55,
        metalness: 0.1,
        roughness: 0.06,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.4
      });
      const dome = new THREE.Mesh(domeGeo, domeMat);
      dome.position.y = 0.14;
      ufoGroup.add(dome);

      // Light beam
      const beamGeo = new THREE.ConeGeometry(0.55, 0.9, 28, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = -0.55;
      ufoGroup.add(beam);

      // Outer lights
      const ringConfigs = [
        { count: 10, radius: 1.62, y: 0.02, size: 0.065, color: 0xfff3a0 },
        { count: 6, radius: 1.05, y: 0.10, size: 0.05, color: 0x9be8ff }
      ];
      ringConfigs.forEach(cfg => {
        for (let i = 0; i < cfg.count; i++) {
          const angle = (i / cfg.count) * Math.PI * 2;
          const geo = new THREE.SphereGeometry(cfg.size, 10, 10);
          const mat = new THREE.MeshStandardMaterial({
            color: cfg.color,
            emissive: cfg.color,
            emissiveIntensity: 1.2
          });
          const m = new THREE.Mesh(geo, mat);
          m.position.set(Math.cos(angle) * cfg.radius, cfg.y, Math.sin(angle) * cfg.radius);
          ufoGroup.add(m);
          lights.push(m);
        }
      });

      scene.add(ufoGroup);

      let start = performance.now();
      const render = (time: number) => {
        const elapsed = (time - start) / 1000;
        ufoGroup.rotation.y += 0.015;
        ufoGroup.position.y = Math.sin(elapsed * 1.5) * 0.12;

        lights.forEach((m, idx) => {
          (m.material as THREE.MeshStandardMaterial).emissiveIntensity =
            0.6 + 0.8 * Math.abs(Math.sin(elapsed * 2 + idx * 0.6));
        });

        renderer.render(scene, camera);
        animId = requestAnimationFrame(render);
      };
      animId = requestAnimationFrame(render);
    } catch {
      setThreeFailed(true);
    }

    return () => {
      cancelAnimationFrame(animId);
      if (renderer) renderer.dispose();
    };
  }, []);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {!threeFailed ? (
        <canvas
          ref={canvasRef}
          width={150}
          height={130}
          className="w-[150px] h-[130px] drop-shadow-[0_0_25px_rgba(56,189,248,0.5)]"
        />
      ) : (
        <div className="w-[130px] h-[98px] animate-pulse">
          <svg viewBox="0 0 120 90" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="60" cy="56" rx="56" ry="15" fill="#38bdf8" />
            <ellipse cx="60" cy="34" rx="27" ry="23" fill="#7dd3fc" />
            <circle cx="20" cy="56" r="4" fill="#fef08a" />
            <circle cx="60" cy="62" r="4" fill="#fef08a" />
            <circle cx="100" cy="56" r="4" fill="#fef08a" />
          </svg>
        </div>
      )}
    </div>
  );
};
