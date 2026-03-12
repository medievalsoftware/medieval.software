<script>
	const skillGroups = [
		{
			label: 'Languages',
			skills: [
				{ name: 'Go', url: 'https://go.dev/', icon: 'devicon-go-original-wordmark', type: 'devicon', accent: '#00ADD8', glow: '0, 173, 216' },
				{ name: 'Zig', url: 'https://ziglang.org/', icon: '/images/zig-mark.svg', type: 'svg', accent: '#F7A41D', glow: '247, 164, 29' },
				{ name: 'C', url: 'https://en.cppreference.com/w/c', icon: 'devicon-c-plain', type: 'devicon', accent: '#A8B9CC' },
				{ name: 'Swift', url: 'https://www.swift.org', icon: 'devicon-swift-plain', type: 'devicon', accent: '#F05138' },
			]
		},
		{
			label: 'Scripting',
			skills: [
				{ name: 'Lua', url: 'https://www.lua.org', icon: 'devicon-lua-plain', type: 'devicon', accent: '#000080', glow: '100, 100, 220' },
				{ name: 'Python', url: 'https://www.python.org', icon: 'devicon-python-plain', type: 'devicon', accent: '#3776AB' },
				{ name: 'Bash', url: 'https://www.gnu.org/software/bash/', icon: 'devicon-bash-plain', type: 'devicon', accent: '#4EAA25', noColor: true },
			]
		},
		{
			label: 'Frameworks & Libraries',
			skills: [
				{ name: 'Svelte', url: 'https://svelte.dev', icon: 'devicon-svelte-plain', type: 'devicon', accent: '#FF3E00', glow: '255, 62, 0' },
				{ name: 'React', url: 'https://react.dev', icon: 'devicon-react-plain', type: 'devicon', accent: '#61DAFB' },
			]
		},
		{
			label: 'Databases',
			skills: [
				{ name: 'PostgreSQL', url: 'https://www.postgresql.org', icon: 'devicon-postgresql-plain', type: 'devicon', accent: '#4169E1', glow: '65, 105, 225' },
				{ name: 'SQLite', url: 'https://www.sqlite.org/', icon: 'devicon-sqlite-plain', type: 'devicon', accent: '#003B57', glow: '15, 128, 204' },
			]
		},
		{
			label: 'APIs',
			skills: [
				{ name: 'OpenGL', url: 'https://www.opengl.org', icon: 'devicon-opengl-plain', type: 'devicon', accent: '#5586A4' },
				{ name: 'WebGL', url: 'https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API', icon: '/images/webgl-logo.svg', type: 'svg', accent: '#990000' },
				{ name: 'WebGPU', url: 'https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API', icon: '/images/webgpu-logo.svg', type: 'svg', accent: '#0093FF' },
			]
		},
		{
			label: 'Editors & IDEs',
			skills: [
				{ name: 'Helix', url: 'https://helix-editor.com/', icon: '/images/helix-logo.svg', type: 'svg', accent: '#706BC8', glow: '112, 107, 200' },
				{ name: 'JetBrains', url: 'https://www.jetbrains.com', icon: 'devicon-jetbrains-plain', type: 'devicon', accent: '#FFDB00' },
				{ name: 'VSCode', url: 'https://code.visualstudio.com', icon: 'devicon-vscode-plain', type: 'devicon', accent: '#007ACC' },
			]
		},
		{
			label: 'Runtimes & Tools',
			skills: [
				{ name: 'Bun', url: 'https://bun.sh', icon: '/images/bun-logo.svg', type: 'svg', accent: '#FBF0DF', glow: '251, 240, 223' },
				{ name: 'Mise', url: 'https://mise.jdx.dev/', icon: '/images/mise-logo.svg', type: 'svg', accent: '#7C4DFF', glow: '124, 77, 255' },
				{ name: 'Git', url: 'https://git-scm.com', icon: 'devicon-git-plain', type: 'devicon', accent: '#F05032' },
			]
		},
		{
			label: 'Platforms',
			skills: [
				{ name: 'Apple', accent: '#DDDDDD', icon: 'devicon-apple-plain', type: 'devicon', glow: '221, 221, 221' },
				{ name: 'Linux', accent: '#FCC624', icon: 'devicon-linux-plain', type: 'devicon' },
				{ name: 'Windows', accent: '#0078D6', icon: 'devicon-windows8-plain', type: 'devicon' },
			]
		},
	];
</script>

<svelte:head>
	<title>Medieval Software - Home</title>
	<meta property="og:title" content="Medieval Software">
	<meta property="og:description"
		content="Medieval Software is an indie dev blog covering software, reverse engineering, voice acting, music, and creative projects.">
	<meta name="description"
		content="Medieval Software is an indie dev blog covering software, reverse engineering, voice acting, music, and creative projects.">
	<meta property="og:url" content="https://medieval.software/">
</svelte:head>

<article id="home">
	<h1>Welcome to Medieval Software!</h1>
	<div id="intro">
		<div class="intro-about">
			<h2>About</h2>
			<p>
				I'm Dane, a programmer and hobbyist since forever, professional since 2019.
				This is where I put things when I want to show them off or talk about them.
			</p>
			<p>
				I love reverse engineering old games, particularly RuneScape from the early-mid 2000s.
				Software rasterization got me hooked, then I fell into audio synthesis and custom network protocols.
				My favorite childhood game is Dungeon Siege 1.
			</p>
			<div class="ai-stance">
				<h2>Stance on AI</h2>
				<p>
					I believe it's as useful as it is destructive. I use it incrementally, guiding it one
					step at a time. I don't "vibe code" projects I care about, but I will "vibe code"
					prototypes. The cost of the time saved depends on the application and audience.
				</p>
			</div>
		</div>
		<div class="intro-skills">
			<h2>Skills <span class="skills-hint">biases glowing</span></h2>
			<div id="skills">
				{#each skillGroups as group}
					<div class="skill-group">
						<h4 class="skill-group-label">{group.label}</h4>
						<div class="skill-chips">
							{#each group.skills as skill}
																{#if skill.url}
									<a
										class="skill-chip"
										href={skill.url}
										target="_blank"
										style="--accent: {skill.accent};{skill.glow ? ` --glow: ${skill.glow}` : ''}"
									>
										{#if skill.type === 'svg'}
											<img class="skill-chip-icon" src={skill.icon} alt={skill.name} />
										{:else if skill.icon}
											<i class="skill-chip-icon {skill.icon}{skill.noColor ? '' : ' colored'}"></i>
										{/if}
										<span class="skill-chip-name">{skill.name}</span>
									</a>
								{:else}
									<span
										class="skill-chip"
										style="--accent: {skill.accent};{skill.glow ? ` --glow: ${skill.glow}` : ''}"
									>
										{#if skill.type === 'svg'}
											<img class="skill-chip-icon" src={skill.icon} alt={skill.name} />
										{:else if skill.icon}
											<i class="skill-chip-icon {skill.icon}{skill.noColor ? '' : ' colored'}"></i>
										{/if}
										<span class="skill-chip-name">{skill.name}</span>
									</span>
								{/if}
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</article>

<style>
	#home {
		gap: 2em;
	}
	#home * {
		margin: 0;
	}

	#intro {
		display: flex;
		gap: 2em;
	}

	#intro h2 {
		font-size: 1em;
		color: var(--fg4);
		padding-bottom: 0.3em;
		margin-bottom: 0.5em;
		border-bottom: 1px solid var(--bg2);
	}

	.intro-about {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.75em;
		text-align: justify;
	}

	.intro-skills {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.75em;
	}


	.ai-stance {
		font-size: 0.8em;
		color: var(--fg4);
		padding-top: 0.5em;
	}

	.ai-stance h2 {
		color: var(--fg4);
	}

	.skills-hint {
		font-size: 0.6em;
		font-weight: normal;
		color: var(--fg4);
		opacity: 0.8;
	}

	@media (max-width: 1024px) {
		#intro {
			flex-direction: column;
		}
	}
</style>
