;(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement
    const $ = (selector, scope = document) => [...scope.querySelectorAll(selector)]
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
      const theme = root.dataset.bsTheme === 'dark' ? 'light' : 'dark'
      root.dataset.bsTheme = theme
      try {
        localStorage.setItem('gd-theme', theme)
      } catch {
        // Theme switching remains available when storage is disabled.
      }
    })

    $('[data-copy]').forEach((button) => {
      button.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(button.dataset.copy)
          const original = button.textContent
          button.textContent = 'Copié ✓'
          window.setTimeout(() => {
            button.textContent = original
          }, 1400)
        } catch {
          button.textContent = 'Copie indisponible'
          window.setTimeout(() => {
            button.textContent = 'Copier'
          }, 1800)
        }
      })
    })

    const mark = (id) => $('[data-nav]').forEach((link) => {
      link.classList.toggle('active', link.dataset.nav === id)
    })
    mark(document.body.dataset.current)

    const tabs = $('[data-command-tab]')
    const selectCommand = (tab) => {
      const panel = document.getElementById(tab.getAttribute('aria-controls'))
      if (!panel) return

      tabs.forEach((item) => {
        const selected = item === tab
        item.classList.toggle('is-active', selected)
        item.setAttribute('aria-selected', String(selected))
        item.tabIndex = selected ? 0 : -1
      })

      $('[data-command-panel]').forEach((item) => {
        item.hidden = item !== panel
      })

      const copyButton = document.querySelector('.hero-terminal [data-copy]')
      if (copyButton) copyButton.dataset.copy = panel.dataset.copy
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => selectCommand(tab))
      tab.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        const next = event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? tabs.length - 1
            : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
        tabs[next]?.focus()
        if (tabs[next]) selectCommand(tabs[next])
      })
    })

    const shaderCanvas = document.querySelector('[data-hero-shader]')
    const motionToggle = document.querySelector('[data-motion-toggle]')
    if (shaderCanvas) {
      const hero = shaderCanvas.closest('[data-hero]')
      const gl = shaderCanvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        powerPreference: 'low-power',
      })

      if (hero && gl) {
        const vertexSource = `
          attribute vec2 a_position;
          varying vec2 v_uv;
          void main() {
            v_uv = a_position * 0.5 + 0.5;
            gl_Position = vec4(a_position, 0.0, 1.0);
          }
        `
        const fragmentSource = `
          precision mediump float;
          uniform vec2 u_resolution;
          uniform vec2 u_mouse;
          uniform float u_time;
          varying vec2 v_uv;

          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
          }

          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
              mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
              f.y
            );
          }

          float fbm(vec2 p) {
            float value = 0.0;
            float amplitude = 0.5;
            for (int i = 0; i < 5; i++) {
              value += noise(p) * amplitude;
              p = p * 2.03 + 11.7;
              amplitude *= 0.5;
            }
            return value;
          }

          void main() {
            float aspect = u_resolution.x / max(u_resolution.y, 1.0);
            vec2 uv = vec2(v_uv.x * aspect, v_uv.y);
            vec2 mouse = vec2(u_mouse.x * aspect, u_mouse.y);
            float time = u_time;

            vec2 warp = vec2(
              fbm(uv * 1.7 + vec2(time * 0.15, -time * 0.09)),
              fbm(uv * 1.7 + vec2(5.2, 1.3) - time * 0.11)
            );
            vec2 flow = vec2(
              fbm(uv * 2.25 + warp * 1.2 + vec2(1.7, 9.2) + time * 0.08),
              fbm(uv * 2.25 + warp * 1.2 + vec2(8.3, 2.8) - time * 0.07)
            );
            float field = fbm(uv * 2.0 + flow * 1.15);
            vec3 color = mix(vec3(0.018, 0.035, 0.029), vec3(0.025, 0.19, 0.12), smoothstep(0.27, 0.79, field));

            vec2 orb = vec2(aspect * (0.25 + 0.08 * sin(time * 0.65)), 0.22 + 0.06 * cos(time * 0.45));
            float glow = exp(-length((uv - orb) * vec2(0.8, 1.0)) * 3.2);
            float pointerGlow = exp(-length((uv - mouse) * vec2(0.72, 1.0)) * 4.2);
            color += vec3(0.015, 0.22, 0.13) * glow * 0.8;
            color += vec3(0.018, 0.16, 0.1) * pointerGlow * 0.62;

            float vignette = 1.0 - smoothstep(0.24, 0.82, length(v_uv - 0.5));
            color *= 0.76 + vignette * 0.24;
            gl_FragColor = vec4(color, 1.0);
          }
        `

        const compile = (type, source) => {
          const shader = gl.createShader(type)
          if (!shader) return null
          gl.shaderSource(shader, source)
          gl.compileShader(shader)
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            gl.deleteShader(shader)
            return null
          }
          return shader
        }

        const vertexShader = compile(gl.VERTEX_SHADER, vertexSource)
        const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource)
        const program = gl.createProgram()

        if (vertexShader && fragmentShader && program) {
          gl.attachShader(program, vertexShader)
          gl.attachShader(program, fragmentShader)
          gl.linkProgram(program)
        }

        if (!vertexShader || !fragmentShader || !program || !gl.getProgramParameter(program, gl.LINK_STATUS)) {
          shaderCanvas.hidden = true
        } else {
          gl.useProgram(program)
          const buffer = gl.createBuffer()
          const position = gl.getAttribLocation(program, 'a_position')
          const resolution = gl.getUniformLocation(program, 'u_resolution')
          const mouse = gl.getUniformLocation(program, 'u_mouse')
          const time = gl.getUniformLocation(program, 'u_time')
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
          gl.enableVertexAttribArray(position)
          gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

          let visible = true
          let paused = false
          let frame = 0
          let pointer = [0.5, 0.5]
          let target = [0.5, 0.5]

          const resize = () => {
            const bounds = hero.getBoundingClientRect()
            const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
            const width = Math.max(1, Math.round(bounds.width * pixelRatio))
            const height = Math.max(1, Math.round(bounds.height * pixelRatio))
            if (shaderCanvas.width === width && shaderCanvas.height === height) return
            shaderCanvas.width = width
            shaderCanvas.height = height
            gl.viewport(0, 0, width, height)
          }

          const draw = (now = 0) => {
            frame = 0
            if (!visible || document.hidden) return

            resize()
            pointer[0] += (target[0] - pointer[0]) * 0.045
            pointer[1] += (target[1] - pointer[1]) * 0.045
            gl.uniform2f(resolution, shaderCanvas.width, shaderCanvas.height)
            gl.uniform2f(mouse, pointer[0], pointer[1])
            gl.uniform1f(time, !paused && !reduceMotion.matches ? now * 0.00012 : 0)
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

            if (!paused && !reduceMotion.matches) frame = requestAnimationFrame(draw)
          }

          const requestDraw = () => {
            if (!frame) frame = requestAnimationFrame(draw)
          }

          hero.addEventListener('pointermove', (event) => {
            const bounds = hero.getBoundingClientRect()
            target = [
              Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
              1 - Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
            ]
          }, { passive: true })
          hero.addEventListener('pointerleave', () => {
            target = [0.5, 0.5]
          })
          window.addEventListener('resize', requestDraw, { passive: true })
          document.addEventListener('visibilitychange', requestDraw)

          if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(([entry]) => {
              visible = entry.isIntersecting
              if (visible) requestDraw()
              else if (frame) {
                cancelAnimationFrame(frame)
                frame = 0
              }
            })
            observer.observe(hero)
          }

          motionToggle?.addEventListener('click', () => {
            paused = !paused
            motionToggle.setAttribute('aria-pressed', String(paused))
            const label = motionToggle.querySelector('[data-motion-label]')
            if (label) label.textContent = paused ? 'Reprendre l’animation' : 'Mettre l’animation en pause'
            if (paused && frame) {
              cancelAnimationFrame(frame)
              frame = 0
            } else {
              requestDraw()
            }
          })

          reduceMotion.addEventListener('change', requestDraw)
          requestDraw()
        }
      }
    }

    if (!reduceMotion.matches && 'IntersectionObserver' in window) {
      root.classList.add('motion-ready')
      const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        })
      }, { threshold: 0.12 })

      $('[data-reveal]').forEach((element, index) => {
        element.style.setProperty('--reveal-delay', `${(index % 6) * 70}ms`)
        revealObserver.observe(element)
      })

      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        $('[data-tilt]').forEach((element) => {
          element.addEventListener('pointermove', (event) => {
            const bounds = element.getBoundingClientRect()
            const x = (event.clientX - bounds.left) / bounds.width - 0.5
            const y = (event.clientY - bounds.top) / bounds.height - 0.5
            element.style.setProperty('--tilt-x', `${-y * 3}deg`)
            element.style.setProperty('--tilt-y', `${x * 3}deg`)
          }, { passive: true })
          element.addEventListener('pointerleave', () => {
            element.style.setProperty('--tilt-x', '0deg')
            element.style.setProperty('--tilt-y', '0deg')
          })
        })
      }
    }

    const links = $('.side a[href^="#"]')
    if (links.length) {
      const byId = new Map(links.map((link) => [link.getAttribute('href').slice(1), link]))
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          links.forEach((link) => link.classList.remove('active'))
          byId.get(entry.target.id)?.classList.add('active')
        })
      }, { rootMargin: '-20% 0px -70% 0px' })
      byId.forEach((_, id) => {
        const element = document.getElementById(id)
        if (element) observer.observe(element)
      })
    }

    const pages = $('[data-page]')
    if (pages.length) {
      const show = () => {
        const hash = location.hash.slice(1)
        const target = hash && document.getElementById(hash)
        const page = pages.find((item) => item.dataset.page === hash)
          || (target && target.closest('[data-page]'))
          || pages[0]
        pages.forEach((item) => {
          item.hidden = item !== page
        })
        mark(page.dataset.page)
        if (target && !pages.includes(target)) target.scrollIntoView()
        else window.scrollTo(0, 0)
      }
      window.addEventListener('hashchange', show)
      show()
    }
  })
})()
