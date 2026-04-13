<svelte:head>
	<title>Datenschutz - TV Muttenz Volleyball</title>
	<meta name="description" content="Datenschutzerklärung für die TV Muttenz Volleyball Website" />
</svelte:head>

<div class="datenschutz-page">
	<h1>Datenschutz</h1>

	<section>
		<h2>Allgemeine Hinweise</h2>
		<p>
			Diese Website ist eine statische Seite, die über GitHub Pages gehostet wird. Es werden keine
			personenbezogenen Daten an Server übertragen oder in Datenbanken gespeichert.
		</p>
	</section>

	<section>
		<h2>Lokale Datenspeicherung (LocalStorage)</h2>
		<p>
			Diese Website nutzt den LocalStorage Ihres Browsers, um folgende Daten lokal auf Ihrem Gerät
			zu speichern:
		</p>
		<ul>
			<li><strong>Kompetenzraster-Assessments:</strong> Ihre Selbsteinschätzungen und Notizen</li>
			<li>
				<strong>Fremdeinschätzungen:</strong> Einschätzungen von Trainern oder anderen Personen
			</li>
			<li><strong>Trainingsplaner:</strong> Ihre ausgewählten Übungen und Notizen</li>
		</ul>
		<p>
			Diese Daten werden <strong>ausschließlich lokal</strong> auf Ihrem Gerät gespeichert und nicht
			an Server übertragen. Sie haben jederzeit die Kontrolle über diese Daten und können sie löschen,
			indem Sie den Browser-Cache leeren.
		</p>
	</section>

	<section>
		<h2>Hosting</h2>
		<p>Diese Website wird auf GitHub Pages gehostet. GitHub kann folgende Daten sammeln:</p>
		<ul>
			<li>IP-Adresse</li>
			<li>Zeitpunkt des Besuchs</li>
			<li>Aufgerufene Seiten</li>
			<li>Browser-Informationen</li>
		</ul>
		<p>
			Weitere Informationen finden Sie in der <a
				href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement"
				target="_blank"
				rel="noopener noreferrer">GitHub Privacy Statement</a
			>.
		</p>
	</section>

	<section>
		<h2>Cookies</h2>
		<p>
			Diese Website verwendet keine eigenen Cookies. GitHub Pages kann jedoch technisch notwendige
			Cookies setzen.
		</p>
	</section>

	<section>
		<h2>Externe Links</h2>
		<p>
			Diese Website kann Links zu externen Websites enthalten. Wir haben keinen Einfluss auf deren
			Inhalte und Datenschutzpraktiken. Bitte informieren Sie sich auf den jeweiligen Websites über
			deren Datenschutzbestimmungen.
		</p>
	</section>

	<section>
		<h2>Ihre Rechte</h2>
		<p>
			Da diese Website keine personenbezogenen Daten serverseitig speichert, können Sie alle lokal
			gespeicherten Daten jederzeit selbst löschen:
		</p>
		<ul>
			<li>
				Löschen Sie den Browser-Cache und die lokalen Website-Daten in Ihren Browser-Einstellungen
			</li>
			<li>Nutzen Sie die in der Website integrierten Lösch-Funktionen (z.B. im Kompetenzraster)</li>
		</ul>
	</section>

	<section>
		<h2>Kontakt</h2>
		<p>
			Bei Fragen zum Datenschutz können Sie sich an den Verantwortlichen wenden:<br />
			Cedric Geissmann<br />
			E-Mail: <a href="mailto:cedric.geissmann@gmail.com">cedric.geissmann@gmail.com</a>
		</p>
	</section>

	<section class="last-updated">
		<p><em>Stand: April 2026</em></p>
	</section>
</div>

<style>
	.datenschutz-page {
		max-width: var(--content-width-text);
		margin: 0 auto;
		padding: var(--spacing-xl) var(--spacing-lg);
	}

	h1 {
		color: var(--color-primary);
		margin-bottom: var(--spacing-xl);
		font-size: var(--font-size-3xl);
	}

	section {
		margin-bottom: var(--spacing-xl);
	}

	h2 {
		color: var(--color-text);
		margin-bottom: var(--spacing-md);
		font-size: var(--font-size-2xl);
		border-bottom: 2px solid var(--color-border);
		padding-bottom: var(--spacing-xs);
	}

	p {
		line-height: 1.8;
		margin-bottom: var(--spacing-md);
		color: var(--color-text);
	}

	ul {
		margin-bottom: var(--spacing-md);
		padding-left: var(--spacing-xl);
		line-height: 1.8;
		color: var(--color-text);
	}

	li {
		margin-bottom: var(--spacing-xs);
	}

	a {
		color: var(--color-primary);
		text-decoration: underline;
		transition: color var(--transition-normal);
	}

	a:hover {
		color: var(--color-text);
	}

	strong {
		font-weight: 600;
		color: var(--color-text);
	}

	.last-updated {
		margin-top: var(--spacing-2xl);
		padding-top: var(--spacing-lg);
		border-top: 1px solid var(--color-border);
	}

	.last-updated p {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		margin-bottom: 0;
	}

	@media (max-width: 768px) {
		.datenschutz-page {
			padding: var(--spacing-lg) var(--spacing-md);
		}

		h1 {
			font-size: var(--font-size-2xl);
		}

		h2 {
			font-size: var(--font-size-xl);
		}
	}
</style>
