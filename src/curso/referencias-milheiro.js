(() => {
	var programs = [
		{ id: "avios", label: "Avios", logo: "avios.svg", ceiling: 56 },
		{ id: "azul", label: "Azul Fidelidade", logo: "azul.svg", ceiling: 15 },
		{ id: "esfera", label: "Esfera", logo: "esfera.webp", ceiling: 31.5 },
		{
			id: "latam",
			label: "LATAM Pass",
			logo: "latam-pass.svg",
			ceiling: 25,
			ratio: 6000,
		},
		{ id: "livelo", label: "Livelo", logo: "livelo.svg", ceiling: 30 },
		{ id: "smiles", label: "Smiles", logo: "smiles.svg", ceiling: 16 },
	];
	var table = {};

	programs.forEach((program) => {
		table[program.id] = program.ceiling;
	});

	window.MILE_REFERENCES = table;

	function fillProgramSelects() {
		document.querySelectorAll("select[data-program-source]").forEach((select) => {
			var logoBase = select.getAttribute("data-logo-base") || "";
			var current = select.value;
			var placeholder = select.querySelector('option[value=""]');
			var placeholderText = placeholder ? placeholder.textContent : "Selecione";
			var empty = document.createElement("option");

			select.textContent = "";
			empty.value = "";
			empty.textContent = placeholderText;
			select.appendChild(empty);
			programs.forEach((program) => {
				var option = document.createElement("option");
				option.value = program.id;
				option.textContent = program.label;
				if (logoBase && program.logo) option.dataset.logo = logoBase + program.logo;
				if (program.ratio) option.dataset.ratio = String(program.ratio);
				select.appendChild(option);
			});
			if (current) select.value = current;
		});
	}

	window.applyMileReferences = () => {
		var digits;
		var text;

		fillProgramSelects();
		document.querySelectorAll("[data-mile-program]").forEach((node) => {
			var value = Number(table[node.getAttribute("data-mile-program")]);
			if (!Number.isFinite(value)) return;
			digits = Number.isInteger(value) ? 0 : 2;
			text = new Intl.NumberFormat("pt-BR", {
				style: "currency",
				currency: "BRL",
				minimumFractionDigits: digits,
				maximumFractionDigits: digits,
			}).format(value);
			node.textContent = `Até ${text.replace(/\u00a0/g, " ")}`;
		});
	};

	window.applyMileReferences();
})();
