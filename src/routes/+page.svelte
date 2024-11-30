<svelte:head>
	<title>Medieval Software - Home</title>
	<meta property="og:title" content="Medieval Software">
	<meta property="og:description"
		content="Medieval Software is an indie game development studio crafting archaic medievel-themed games and software.">
	<meta name="description"
		content="Medieval Software is an indie game development studio crafting archaic medievel-themed games and software.">
	<meta property="og:url" content="https://medieval.software/">
</svelte:head>

<article id="home">
	<h1>About</h1>
	<div class="row gap-1">
		<div class="col-1-10 gutter">
			<p>Site</p>
		</div>
		<div class="col-9-10 content">
			<p>
				Medieval Software was born out of my love for software development and the medieval times.
				At the moment it isn't much of a company, it's more of a self hosted blog for my
				thoughts and endeavors.
			</p>
		</div>
	</div>
	<div class="row gap-1">
		<div class="col-1-10 gutter">
			<p>Me</p>
		</div>
		<div class="col-9-10 content">
			<p>I'm Dane, some sort of a programmer.</p>
			<p>
				I love reverse engineering old stuff, particularly RuneScape from the early-mid 2000s. The
				cpu rendering in particular is what got me into it, then I fell into a rabbit hole of audio
				synthesis and custom network protocols atop TCP.
			</p>
		</div>
	</div>
	<div class="row gap-1">
		<div class="col-1-10 gutter">
			<p>Skills</p>
		</div>
		<!-- svelte-ignore a11y-missing-content -->
		<!-- svelte-ignore a11y-missing-attribute -->
		<div class="col-9-10 content">
			<p>
				My skills vary widely from backend to frontend, ranging from fiddling with bits over custom
				internet protocols - to creating sleek and responsive websites. I've been a hobbyist all my
				life and a professional since 2019.
			</p>
			<div id="skills" class="row">
				<span data-tooltip="Language: Go">
					<a
						href="https://go.dev/"
						target="_blank"
						class="tech devicon-go-original-wordmark colored"
					/>
				</span>

				<span data-tooltip="Language: C">
					<a
						href="https://en.cppreference.com/w/c"
						target="_blank"
						class="tech icon devicon-c-plain colored"
					/>
				</span>

				<span data-tooltip="Language: C#">
					<a
						href="https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/"
						target="_blank"
						class="tech icon devicon-csharp-plain colored"
					/>
				</span>

				<span data-tooltip="Language: Java">
					<a
						href="https://www.oracle.com/java/technologies/"
						target="_blank"
						class="tech icon devicon-java-plain colored"
					/>
				</span>

				<span data-tooltip="Language: HTML">
					<a
						href="https://developer.mozilla.org/en-US/docs/Web/HTML"
						target="_blank"
						class="tech icon devicon-html5-plain colored"
					/>
				</span>

				<span data-tooltip="Language: CSS">
					<a
						href="https://developer.mozilla.org/en-US/docs/Web/CSS"
						target="_blank"
						class="tech icon devicon-css3-plain colored"
					/>
				</span>

				<span data-tooltip="CSS Extension: Sass">
					<a
						href="https://sass-lang.com"
						target="_blank"
						class="tech icon devicon-sass-plain colored"
					/>
				</span>

				<span data-tooltip="Language: JavaScript">
					<a
						href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference"
						target="_blank"
						class="tech icon devicon-javascript-plain colored"
					/>
				</span>

				<span data-tooltip="Language: TypeScript">
					<a
						href="https://www.typescriptlang.org/"
						target="_blank"
						class="tech icon devicon-typescript-plain colored"
					/>
				</span>

				<span data-tooltip="Language: Python">
					<a
						href="https://www.python.org"
						target="_blank"
						class="tech icon devicon-python-plain colored"
					/>
				</span>

				<span data-tooltip="Language: Lua">
					<a
						href="https://www.lua.org"
						target="_blank"
						class="tech icon devicon-lua-plain colored"
						style="color:#33A"
					/>
				</span>

				<hr />

				<span data-tooltip="Web Framework: Svelte">
					<a
						href="https://svelte.dev"
						target="_blank"
						class="tech icon devicon-svelte-plain colored"
					/>
				</span>

				<span data-tooltip="Web Framework: Angular">
					<a
						href="https://angular.io"
						target="_blank"
						class="tech icon devicon-angularjs-plain colored"
					/>
				</span>

				<span data-tooltip="Web Manager: WordPress">
					<a
						href="https://wordpress.com"
						target="_blank"
						class="tech icon devicon-wordpress-plain colored"
					/>
				</span>

				<span data-tooltip="Web Library: React">
					<a
						href="https://react.dev"
						target="_blank"
						class="tech icon devicon-react-plain colored"
					/>
				</span>

				<span data-tooltip="Web Library: JQuery">
					<a
						href="https://jquery.com"
						target="_blank"
						class="tech icon devicon-jquery-plain colored"
					/>
				</span>

				<span data-tooltip="Backend Framework: Spring">
					<a
						href="https://spring.io"
						target="_blank"
						class="tech icon devicon-spring-plain colored"
					/>
				</span>

				<span data-tooltip="Specification: OpenGL">
					<a
						href="https://www.opengl.org"
						target="_blank"
						class="tech icon devicon-opengl-plain colored"
					/>
				</span>

				<span data-tooltip="App Library: SDL">
					<a
						href="https://www.libsdl.org"
						target="_blank"
						class="tech icon devicon-sdl-plain colored"
					/>
				</span>

				<hr />

				<span data-tooltip="Database: Microsoft SQL Server">
					<a
						href="https://learn.microsoft.com/en-us/sql/sql-server/what-s-new-in-sql-server-2022"
						target="_blank"
						class="tech icon devicon-microsoftsqlserver-plain colored"
					/>
				</span>
				
				<span data-tooltip="Database: MySQL">
					<a
						href="https://www.mysql.com"
						target="_blank"
						class="tech icon devicon-mysql-plain colored"
					/>
				</span>

				<span data-tooltip="Database: PostgreSQL">
					<a
						href="https://www.postgresql.org"
						target="_blank"
						class="tech icon devicon-postgresql-plain colored"
					/>
				</span>

				<span data-tooltip="Database: SQLite">
					<a
						href="https://www.sqlite.org/"
						target="_blank"
						class="tech icon devicon-sqlite-plain colored"
					/>
				</span>

				<hr />

				<span data-tooltip="Text Editor: Vim">
					<a
						href="https://www.vim.org"
						target="_blank"
						class="tech icon devicon-vim-plain colored"
					/>
				</span>

				<span data-tooltip="Text Editor: VSCode">
					<a
						href="https://code.visualstudio.com"
						target="_blank"
						class="tech icon devicon-vscode-plain colored"
					/>
				</span>

				<span data-tooltip="IDE: JetBrains Products">
					<a
						href="https://www.jetbrains.com"
						target="_blank"
						class="tech icon devicon-jetbrains-plain colored"
					/>
				</span>

				<span data-tooltip="IDE: Visual Studio">
					<a
						href="https://visualstudio.microsoft.com"
						target="_blank"
						class="tech icon devicon-visualstudio-plain colored"
					/>
				</span>

				<hr />

				<span data-tooltip="Runtime: NodeJS">
					<a
						href="https://nodejs.org/"
						target="_blank"
						class="tech icon devicon-nodejs-plain colored"
					/>
				</span>

				<span data-tooltip="Source Control: Git">
					<a
						href="https://git-scm.com"
						target="_blank"
						class="tech icon devicon-git-plain colored"
					/>
				</span>

				<span data-tooltip="DevOps: GitHub">
					<a
						href="https://github.com"
						target="_blank"
						class="tech icon devicon-github-plain colored"
					/>
				</span>

				<span data-tooltip="DevOps: GitLab">
					<a
						href="https://gitlab.com"
						target="_blank"
						class="tech icon devicon-gitlab-plain colored"
					/>
				</span>

				<hr />

				<span data-tooltip="Environment: Apple">
					<a target="_blank" class="tech icon devicon-apple-plain colored" style="color:#ddd" />
				</span>

				<span data-tooltip="Environment: Linux">
					<span class="tech icon devicon-linux-plain colored" style="color:#111" />
				</span>

				<span data-tooltip="Environment: Windows">
					<span class="tech icon devicon-windows8-plain colored" />
				</span>
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

	.gutter {
		text-align: right;
		color: var(--fg4);
	}

	.content {
		gap: 1em;
	}

	.content > *:last-child {
		margin-bottom: 1rem;
	}
</style>
