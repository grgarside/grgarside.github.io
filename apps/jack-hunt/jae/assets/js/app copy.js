function save() {
	var data = {
		studentInfo: {
			studentName: $('#studentName')[0].value,
			studentPhoto: $('#studentPhotoImage').prop('src'),
			studentYear: $('#studentYear')[0].value,
			studentTutor: $('#studentTutor')[0].value,
			studentSport: $('#studentSport')[0].value,
			studentMentor: $('#studentMentor')[0].value,
			studentContact: $('#studentContact')[0].value
		}
	}
	console.log(data);
	var blob = new Blob([LZString.compressToUTF16(JSON.stringify(data))], {type: "text/plain;charset=utf-8"});
	saveAs(blob, "hello world.json");
}

function loadbuttonHandler() {
	$('#loadbutton span').one('click', function() {
		$('#load').trigger('click');
		loadbuttonHandler();
	});
}
function load() {
	var file = document.getElementById('load').files[0];
	var reader = new FileReader();
	reader.onload = function() {
		var data = JSON.parse(LZString.decompressFromUTF16(reader.result));
		console.log(data);
		$('#studentName')[0].value = data['studentInfo']['studentName'];
		$('#studentPhotoImage').prop('src', data['studentInfo']['studentPhoto']);
		$('#studentYear')[0].value = data['studentInfo']['studentYear'];
		$('#studentTutor')[0].value = data['studentInfo']['studentTutor'];
		$('#studentSport')[0].value = data['studentInfo']['studentSport'];
		$('#studentMentor')[0].value = data['studentInfo']['studentMentor'];
		$('#studentContact')[0].value = data['studentInfo']['studentContact'];
	};
	if (file) {
		reader.readAsText(file);
	}
}

function readStudentPhoto() {
	var preview = document.getElementById('studentPhotoImage');
	var file = document.getElementById('studentPhoto').files[0];
	var reader = new FileReader();
	reader.onload = function() {
		preview.src = reader.result;
	};
	if (file) {
		reader.readAsDataURL(file);
	}
}


$(document).ready(function() {
	
	// load/save
	document.getElementById('load').addEventListener('change', load, false);
	document.getElementById('studentPhoto').addEventListener('change', readStudentPhoto, false);
	loadbuttonHandler();
	$('#savebutton').on('click', save);
	
	// meetings
	$('ul.tabs li').click(function(){
		var tab_id = $(this).attr('data-tab');

		$('ul.tabs li').removeClass('current');
		$('.tab-content').removeClass('current');

		$(this).addClass('current');
		$("#"+tab_id).addClass('current');
	})

});