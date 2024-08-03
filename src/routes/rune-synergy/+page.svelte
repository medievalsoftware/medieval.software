<svelte:head>
	<title>Medieval Software - Rune Synergy</title>
</svelte:head>

<article id="rune-synergy">
	<div class="row" style="max-height:10em;margin-bottom:2em">
		<img
			src="/posts/looking-forward/runesynergy.png"
			alt="Rune Synergy Logo"
			style="object-fit:scale-down"
		/>
	</div>

	<div class="row gap-1">
		<div class="col-1-10 gutter">
			<p>Overview</p>
		</div>
		<div class="col-9-10">
			<p>
				An old school RuneScape Private Server that aims to recreate the nostalgic experience of
				2005.
			</p>
		</div>
	</div>

	<hr />

	<div class="row gap-1">
		<div class="col-1-10 gutter">
			<p>Vision</p>
		</div>
		<div class="col-9-10">
			<p>
				Rune Synergy aims to fulfill all of the content of RuneScape leading up to 27th June 2005
				(Recruitment Drive) with the possibility of moving forward while staying loyal to the
				original theme of the game.
			</p>
			<h3>🏘️ Community-driven development</h3>
			<p>
				Whether you're a player, developer, or just someone with a curiosity for game design: your
				feedback, contributions, and ideas will help shape the future of the games development. Join
				our active and welcoming community on <a
					href="https://discord.gg/spGvP5EJDk"
					target="_blank">Discord</a
				>, where you can contribute, ask questions, or just chat with fellow RuneScape enthusiasts.
			</p>
			<h3>📜 Devblogs</h3>
			<p>
				Stay updated on our progress through our regular devblogs, where we'll share insights into
				our development process, challenges, and milestones.
			</p>
			<h3>🌎 Centrally hosted</h3>
			<p>
				After much consideration, it made the most sense that the game should be centrally hosted to
				foster a healthy ecosystem, as opposed to being entirely open sourced and ran independently.
				This means that as development progresses, the player base will feel the changes and
				contributions together, hopefully allowing for more effective feedback.
			</p>
		</div>
	</div>

	<hr />

	<div class="row gap-1">
		<div class="col-1-10 gutter">
			<p>Technical</p>
		</div>
		<div class="col-9-10">
			<p>
				It features a front and backend entirely written in <a href="https://go.dev" target="_blank"
					>Go</a
				> that focuses on serving as a RuneScape Engine. Currently the engine has no name, but Rune Synergy
				will be its first game. Think Garry's Mod but for RuneScape.
			</p>
			<p>
				This means the game client and server have been rewritten from the ground up with all of our
				workflow goals in mind, allowing for more than just an original experience for now!
			</p>
			<h3>⌨️ Scriptable</h3>
			<p>
				Scripting is not only a facet for extensibility, it provides realtime feedback, and offers
				an efficient platform for debugging and collaboration.
			</p>
			<p>(Insert cool live scripting graphic here)</p>
			<h3>🛠️ Tooling</h3>
			<p>
				Eventually, tooling will be provided to allow streamlined management and creation of assets
				such as 3D models, animations, sound effects, and more. Currently models and animations will
				be done through Blender, and sound effects through a custom <a
					href="/posts/devblog-1/jagfx-1.png"
					target="_blank">JagFX</a
				>-like interface.
			</p>
			<p>(Insert cool tooling preview here)</p>
		</div>
	</div>
</article>

<style>
	#rune-synergy > div {
		margin: 0;
	}
	.gutter {
		text-align: right;
		color: var(--fg4);
		flex-basis: 5em;
	}
</style>
