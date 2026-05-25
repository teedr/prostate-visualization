import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { BiopsyRegion, BiopsySite, BiopsyStatus } from './reportParser'

type Prostate3DViewProps = {
  sites: BiopsySite[]
  selectedSiteId?: string
  onSelect: (id: string) => void
}

type MarkerModel = {
  site: BiopsySite
  position: THREE.Vector3
  entry: THREE.Vector3
  radius: number
}

const regionY: Record<BiopsyRegion, number> = {
  base: 0.72,
  mid: 0,
  apex: -0.72,
}

const statusColors: Record<BiopsyStatus, number> = {
  benign: 0xb7c7c2,
  suspicious: 0xf0c85a,
  malignant: 0xcc4157,
  unknown: 0x9aa7b1,
}

const gradeColors: Record<number, number> = {
  1: 0xf5d46c,
  2: 0xf7a35d,
  3: 0xee6d52,
  4: 0xcc4157,
  5: 0x5e3f86,
}

export function Prostate3DView({
  sites,
  selectedSiteId,
  onSelect,
}: Prostate3DViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const markers = useMemo(() => buildMarkers(sites), [sites])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }
    const containerElement = container

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf7faf8)
    scene.fog = new THREE.Fog(0xf7faf8, 5.5, 9)

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
    camera.position.set(0, 0.22, 4.6)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.domElement.className = 'prostate-canvas'
    renderer.domElement.setAttribute(
      'aria-label',
      '3D prostate biopsy visualization',
    )
    containerElement.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.45
    controls.enablePan = false
    controls.minDistance = 2.8
    controls.maxDistance = 6.4
    controls.target.set(0, 0, 0)

    scene.add(new THREE.HemisphereLight(0xffffff, 0xb8c2be, 2.2))
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2)
    keyLight.position.set(2.8, 3.5, 4)
    keyLight.castShadow = true
    scene.add(keyLight)

    const rimLight = new THREE.DirectionalLight(0xdef6f0, 1.7)
    rimLight.position.set(-4, 1.6, -3)
    scene.add(rimLight)

    const group = new THREE.Group()
    group.name = 'prostate-marker-group'
    group.rotation.y = -0.2
    scene.add(group)

    const prostate = new THREE.Mesh(
      new THREE.SphereGeometry(1, 72, 48),
      new THREE.MeshPhysicalMaterial({
        color: 0xf2eee4,
        roughness: 0.72,
        metalness: 0,
        transparent: true,
        opacity: 0.46,
        side: THREE.DoubleSide,
      }),
    )
    prostate.name = 'schematic-prostate'
    prostate.scale.set(1.12, 1.24, 0.7)
    prostate.castShadow = true
    prostate.receiveShadow = true
    group.add(prostate)

    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(1.012, 48, 28),
      new THREE.MeshBasicMaterial({
        color: 0xb9c7c2,
        transparent: true,
        opacity: 0.18,
        wireframe: true,
      }),
    )
    shell.scale.copy(prostate.scale)
    group.add(shell)

    const urethra = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.038, 2.05, 18),
      new THREE.MeshStandardMaterial({
        color: 0x0e6b5f,
        transparent: true,
        opacity: 0.58,
      }),
    )
    urethra.position.set(0, -0.03, 0.04)
    group.add(urethra)

    const basePlane = new THREE.Mesh(
      new THREE.CircleGeometry(1.05, 72),
      new THREE.MeshBasicMaterial({
        color: 0x0e6b5f,
        transparent: true,
        opacity: 0.07,
        side: THREE.DoubleSide,
      }),
    )
    basePlane.rotation.x = Math.PI / 2
    basePlane.position.y = regionY.base
    group.add(basePlane)

    const apexPlane = basePlane.clone()
    apexPlane.position.y = regionY.apex
    apexPlane.scale.set(0.6, 0.6, 0.6)
    group.add(apexPlane)

    const clickableMarkers: THREE.Object3D[] = []

    for (const marker of markers) {
      const color = markerColor(marker.site)
      const isSelected = marker.site.id === selectedSiteId
      const markerMesh = new THREE.Mesh(
        new THREE.SphereGeometry(marker.radius, 32, 20),
        new THREE.MeshStandardMaterial({
          color,
          emissive: isSelected ? color : 0x000000,
          emissiveIntensity: isSelected ? 0.38 : 0.05,
          roughness: 0.35,
        }),
      )

      markerMesh.position.copy(marker.position)
      markerMesh.castShadow = true
      markerMesh.userData.siteId = marker.site.id
      markerMesh.name = marker.site.normalizedLabel
      clickableMarkers.push(markerMesh)
      group.add(markerMesh)

      const track = cylinderBetween(
        marker.entry,
        marker.position,
        isSelected ? 0x15201e : 0x6c7a75,
        isSelected ? 0.016 : 0.009,
      )
      track.userData.siteId = marker.site.id
      clickableMarkers.push(track)
      group.add(track)

      const label = makeTextSprite(markerLabel(marker.site), color, isSelected)
      label.position.copy(marker.position)
      label.position.y += marker.radius + 0.09
      group.add(label)

      if (isSelected) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(marker.radius + 0.04, 0.012, 12, 60),
          new THREE.MeshBasicMaterial({ color: 0x15201e }),
        )
        ring.position.copy(marker.position)
        ring.lookAt(camera.position)
        group.add(ring)
      }
    }

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.82, 80),
      new THREE.MeshBasicMaterial({
        color: 0xdce5e1,
        transparent: true,
        opacity: 0.48,
        side: THREE.DoubleSide,
      }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -1.52
    floor.receiveShadow = true
    scene.add(floor)

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let pointerStart: { x: number; y: number } | undefined

    function resize() {
      const width = Math.max(320, containerElement.clientWidth)
      const height = Math.max(420, containerElement.clientHeight)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }

    function siteIdForEvent(event: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(clickableMarkers, true)[0]
      return hit?.object.userData.siteId as string | undefined
    }

    function handlePointerDown(event: PointerEvent) {
      pointerStart = { x: event.clientX, y: event.clientY }
    }

    function handlePointerUp(event: PointerEvent) {
      if (!pointerStart) {
        return
      }

      const moved = Math.hypot(
        event.clientX - pointerStart.x,
        event.clientY - pointerStart.y,
      )
      pointerStart = undefined

      if (moved > 6) {
        return
      }

      const siteId = siteIdForEvent(event)
      if (siteId) {
        onSelect(siteId)
      }
    }

    function handlePointerMove(event: PointerEvent) {
      renderer.domElement.style.cursor = siteIdForEvent(event) ? 'pointer' : 'grab'
    }

    renderer.domElement.addEventListener('pointerdown', handlePointerDown)
    renderer.domElement.addEventListener('pointerup', handlePointerUp)
    renderer.domElement.addEventListener('pointermove', handlePointerMove)

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(containerElement)
    resize()

    let animationFrame = 0
    function animate() {
      animationFrame = window.requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      window.cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown)
      renderer.domElement.removeEventListener('pointerup', handlePointerUp)
      renderer.domElement.removeEventListener('pointermove', handlePointerMove)
      controls.dispose()
      scene.traverse((object) => {
        if (isMesh(object)) {
          object.geometry.dispose()
          disposeMaterial(object.material)
          return
        }

        if (object instanceof THREE.Sprite) {
          disposeMaterial(object.material)
        }
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [markers, onSelect, selectedSiteId])

  return (
    <div className="three-view">
      <div className="three-stage" ref={containerRef}>
        <span className="three-label three-label-base">Base</span>
        <span className="three-label three-label-apex">Apex</span>
        <span className="three-label three-label-right">Patient right</span>
        <span className="three-label three-label-left">Patient left</span>
      </div>
      {markers.length === 0 && (
        <div className="three-empty">No parsed biopsy markers to render.</div>
      )}
    </div>
  )
}

function buildMarkers(sites: BiopsySite[]) {
  return sites.map((site, index) => markerForSite(site, index))
}

function markerForSite(site: BiopsySite, index: number): MarkerModel {
  const y = site.region ? regionY[site.region] : 0.36 - (index % 4) * 0.24
  const sideSign = site.side === 'right' ? -1 : site.side === 'left' ? 1 : 0
  const xMagnitude = site.track === 'lateral' ? 0.72 : site.track === 'medial' ? 0.34 : 0.5
  const fallbackX = ((index % 5) - 2) * 0.28
  const x = site.side ? sideSign * xMagnitude : fallbackX
  const targetLift = site.isTargeted ? 0.15 : 0
  const z = site.isTargeted ? 0.2 : 0.34
  const position = new THREE.Vector3(x, y + targetLift, z)
  const entry = new THREE.Vector3(x * 1.16, y + targetLift + 0.02, 1.12)

  return {
    site,
    position,
    entry,
    radius: site.isTargeted ? 0.095 : site.status === 'malignant' ? 0.08 : 0.064,
  }
}

function markerColor(site: BiopsySite) {
  if (site.status === 'malignant' && site.gradeGroup) {
    return gradeColors[site.gradeGroup] ?? statusColors.malignant
  }

  return statusColors[site.status]
}

function markerLabel(site: BiopsySite) {
  if (site.status === 'malignant') {
    return site.gradeGroup ? `GG${site.gradeGroup}` : 'CA'
  }

  if (site.status === 'suspicious') {
    return 'PIN'
  }

  if (site.status === 'benign') {
    return 'B'
  }

  return '?'
}

function cylinderBetween(
  start: THREE.Vector3,
  end: THREE.Vector3,
  color: number,
  radius: number,
) {
  const midpoint = start.clone().add(end).multiplyScalar(0.5)
  const direction = end.clone().sub(start)
  const length = direction.length()
  const cylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 10),
    new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.62,
      roughness: 0.46,
    }),
  )

  cylinder.position.copy(midpoint)
  cylinder.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  )

  return cylinder
}

function makeTextSprite(text: string, color: number, selected: boolean) {
  const canvas = document.createElement('canvas')
  canvas.width = 180
  canvas.height = 84
  const context = canvas.getContext('2d')
  if (!context) {
    return new THREE.Sprite()
  }

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = selected ? '#15201e' : rgba(color, 0.92)
  roundRect(context, 30, 14, 120, 48, 12)
  context.fill()
  context.fillStyle = selected || needsLightText(color) ? '#ffffff' : '#15201e'
  context.font = '700 30px Inter, Arial, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, 90, 39)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    }),
  )
  sprite.scale.set(0.46, 0.22, 1)
  return sprite
}

function rgba(color: number, alpha: number) {
  const parsed = new THREE.Color(color)
  return `rgba(${Math.round(parsed.r * 255)}, ${Math.round(
    parsed.g * 255,
  )}, ${Math.round(parsed.b * 255)}, ${alpha})`
}

function needsLightText(color: number) {
  const parsed = new THREE.Color(color)
  const luminance = 0.2126 * parsed.r + 0.7152 * parsed.g + 0.0722 * parsed.b
  return luminance < 0.45
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.arcTo(x + width, y, x + width, y + height, radius)
  context.arcTo(x + width, y + height, x, y + height, radius)
  context.arcTo(x, y + height, x, y, radius)
  context.arcTo(x, y, x + width, y, radius)
  context.closePath()
}

function isMesh(object: THREE.Object3D): object is THREE.Mesh {
  return object instanceof THREE.Mesh
}

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) {
    material.forEach((entry) => entry.dispose())
    return
  }

  if ('map' in material && material.map instanceof THREE.Texture) {
    material.map.dispose()
  }

  material.dispose()
}
