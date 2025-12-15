$(function(){
	const $dropzone = $('#dropzone');
	const $fileInput = $('#fileInput');
	const $selectBtn = $('#selectBtn');
	const $processBtn = $('#processBtn');
	const $preview = $('#preview');
	const $downloadArea = $('#downloadArea');

	const $progressWrapper = $('#progressWrapper');
	const $progressFill = $('#progressFill');
	const $progressText = $('#progressText');

	const $previewCount = $('#previewCount');
	const $previewToggle = $('#previewToggle');
	const $togglePreview = $('#togglePreview');

	let files = [];
	let previewExpanded = false;

	/* File picker */
	$selectBtn.on('click', () => $fileInput.trigger('click'));

	$fileInput.on('change', function(){
		handleFiles(this.files);
	});

	/* Drag & drop */
	$dropzone.on('dragover', e => { e.preventDefault(); $dropzone.addClass('dragover'); });
	$dropzone.on('dragleave', () => $dropzone.removeClass('dragover'));
	$dropzone.on('drop', e => { e.preventDefault(); $dropzone.removeClass('dragover'); handleFiles(e.originalEvent.dataTransfer.files); });

	function handleFiles(selectedFiles){
		files = Array.from(selectedFiles).filter(f => f.type.startsWith('image/'));
		$preview.empty();
		$downloadArea.empty();
		$progressWrapper.prop('hidden', true);

		previewExpanded = false;
		$preview.removeClass('expanded');
		$togglePreview.text('Expand preview');
		$previewToggle.hide();

		/* Update preview count */
		if(files.length){
			$previewCount.text(files.length + ' image' + (files.length>1?'s':'') + ' selected').prop('hidden', false);
		}else{
			$previewCount.prop('hidden', true);
		}

		files.forEach(file=>{
			const reader = new FileReader();
			reader.onload = e=>{
				const item = $('<div class="preview-item"></div>');
				item.append('<img src="'+e.target.result+'">');
				item.append('<div>'+file.name+'</div>');
				$preview.append(item);
				requestAnimationFrame(checkPreviewOverflow);
			};
			reader.readAsDataURL(file);
		});
	}

	function checkPreviewOverflow(){
		if($preview[0].scrollHeight > $preview.outerHeight()) $previewToggle.show();
	}

	/* Expand/collapse preview */
	$togglePreview.on('click', ()=>{
		previewExpanded = !previewExpanded;
		$preview.toggleClass('expanded', previewExpanded);
		$togglePreview.text(previewExpanded?'Collapse preview':'Expand preview');
	});

	/* Remove metadata */
	$processBtn.on('click', async ()=>{
		if(!files.length) return;

		$downloadArea.empty();
		$progressWrapper.prop('hidden', false);
		$progressFill.css('width','0%');
		$progressText.text('Processing 0 / '+files.length);

		const zip = new JSZip();
		let index=0;

		for(const file of files){
			index++;
			const reader = new FileReader();
			const dataURL = await new Promise(resolve=>{
				reader.onload = e=>resolve(e.target.result);
				reader.readAsDataURL(file);
			});

			const stripped = piexif.remove(dataURL);
			const blob = dataURLToBlob(stripped);

			zip.file(file.name.replace(/\.[^/.]+$/,'')+'.jpg', blob);

			const percent = Math.round((index/files.length)*100);
			$progressFill.css('width', percent+'%');
			$progressText.text('Processing '+index+' / '+files.length);
		}

		const zipBlob = await zip.generateAsync({type:'blob'});
		const url = URL.createObjectURL(zipBlob);

		$progressWrapper.prop('hidden', true);
		$downloadArea.html('<a href="'+url+'" download="imgwash-images.zip">Download Cleaned Images (ZIP)</a>');
	});

	function dataURLToBlob(dataURL){
		const arr = dataURL.split(','), mime = arr[0].match(/:(.*?);/)[1];
		const bstr = atob(arr[1]);
		let n=bstr.length;
		const u8arr=new Uint8Array(n);
		while(n--) u8arr[n]=bstr.charCodeAt(n);
		return new Blob([u8arr], {type:mime});
	}
});
