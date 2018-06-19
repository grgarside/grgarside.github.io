_kmq.push(['clearIdentity']);
var meetingCategories = ['meetings', 'home', 'squad', 'school'];
var version = 1;
function save() {
	if ($('#studentName')[0].value == "") {
		alert("Load a student or start a new form before saving")
		return;
	}
	var data = {
		meta: {
			version: version,
		},
		studentInfo: {
			studentName: $('#studentName')[0].value,
			studentPhoto: $('#studentPhotoImage').data('dataImage'),
			studentYear: $('#studentYear')[0].value,
			studentTutor: $('#studentTutor')[0].value,
			studentSport: $('#studentSport')[0].value,
			studentMentor: $('#studentMentor')[0].value,
			studentContact: $('#studentContact')[0].value
		},
		meetings: [],
		home: [],
		squad: [],
		school: [],
		updates: []
	}
	
	_kmq.push(['identify', $('#studentName')[0].value]);
	if (data['studentInfo']['studentPhoto'] && Object.keys(data['studentInfo']['studentPhoto']).length > 0) {
		_kmq.push(['set', {'Photo': $('#studentPhotoImage').data('dataImage').data.link}]);
	}
	
	for (var meetingCategoriesIndex = 0; meetingCategoriesIndex < meetingCategories.length; meetingCategoriesIndex++) {
		var category = meetingCategories[meetingCategoriesIndex];
		$('[data-tab-content="tab-' + category + '"] .accordion .meeting').each(function() {
			var dataMeeting = [];
			$(this).find('input, textarea').each(function() {
				var field = $(this);
				if (field.is('input[type="text"], textarea')) {
					dataMeeting.push(field[0].value);
				} else if (field.is('input[type="radio"]')) {
					dataMeeting.push(field[0].checked);
				}
			});
			data[category].push(dataMeeting);
		});
	}
	
	$('.updates li').each(function() {
		data['updates'].push({
			'image': $(this).find('img').data('dataImage'),
			'text': $(this).find('textarea')[0].value
		});
	});
	
	console.log(data);
	
	if (updateId) {
		uploadDocument(data);
	} else {
		saveNew(data);
	}
}
function uploadDocument(data, parent) {
	NProgress.start();
	var blob = new Blob([LZString.compressToEncodedURIComponent(JSON.stringify(data))], {type: "text/plain;charset=utf-8"});
	var reader = new FileReader();
	reader.onload = function() {
		const boundary = '-------314159265358979323846';
		const delimiter = "\r\n--" + boundary + "\r\n";
		const close_delim = "\r\n--" + boundary + "--";
		
		var metadata = {
			name: data['studentInfo']['studentName'] + '.jaestudent',
			'mimeType': "plain/text",
		};
		if (parent) {
			metadata.parents = [parent];
		}
		
		var multipartRequestBody =
			delimiter +	'Content-Type: application/json\r\n\r\n' +
			JSON.stringify(metadata) +
			delimiter +
			'Content-Type: plain/text\r\n';
		
		var upload = reader.result;
		var pos = upload.indexOf('base64,');
		multipartRequestBody += 'Content-Transfer-Encoding: base64\r\n' + '\r\n' + upload.slice(pos < 0 ? 0 : (pos + 'base64,'.length)) + close_delim;
		
		gapi.client.request({
			path: '/upload/drive/v3/files' + (updateId ? ('/' + updateId) : '') + '?uploadType=multipart',
			method: updateId ? 'PATCH' : 'POST',
			headers: { 'Content-Type': 'multipart/form-data; boundary="' + boundary + '"' },
			body: multipartRequestBody,
		}).execute(function(file) {
			console.log("Update Complete ", file);
			updateId = file.id;
			$('#savebutton').text("Save " + file.name);
			_kmq.push(['record', 'Saved']);
			NProgress.done();
		});
	};
	if (blob) {
		reader.readAsDataURL(blob);
	}
}
var updateId;
function load(url) {
	_kmq.push(['clearIdentity']);
	NProgress.start();
	$.ajax({
		url: url,
		headers: { "Authorization": "Bearer " + oauth },
		success: function(file) {
			var data = JSON.parse(LZString.decompressFromEncodedURIComponent(file));
			console.log(data);
			
			// Initialisation
			if (data['meta']['version'] != version) {
				alert("Student file version not " + version + ", file is incompatible with this version of the JAE app.");
				return;
			}
			resetForm(true);
			
			// Load data
			currentFileRevision = data['meta']['revision'];
			$('#studentName')[0].value = data['studentInfo']['studentName'];
			$('#savebutton').text("Save " + data['studentInfo']['studentName'] + ".jaestudent");
			if (data['studentInfo']['studentPhoto'] && Object.keys(data['studentInfo']['studentPhoto']).length > 0) {
				$('#studentPhotoImage').data('dataImage', data['studentInfo']['studentPhoto']).prop('src', $('#studentPhotoImage').data('dataImage').data.link);
			}
			$('#studentYear')[0].value = data['studentInfo']['studentYear'];
			$('#studentTutor')[0].value = data['studentInfo']['studentTutor'];
			$('#studentSport')[0].value = data['studentInfo']['studentSport'];
			$('#studentMentor')[0].value = data['studentInfo']['studentMentor'];
			$('#studentContact')[0].value = data['studentInfo']['studentContact'];
			for (var meetingCategoriesIndex = 0; meetingCategoriesIndex < meetingCategories.length; meetingCategoriesIndex++) {
				var category = meetingCategories[meetingCategoriesIndex];
				for (var meetingIndex = 0; meetingIndex < data[category].length; meetingIndex++) {
					var meeting = $(addMeeting($('[data-tab-content="tab-' + category + '"] .new')));
					var meetingFields = meeting.find('input, textarea');
					var dataMeeting = data[category][meetingIndex];
					// Set meeting list button text to meeting date
					meeting.find('> button').text(dataMeeting[0]);
					for (var meetingFieldIndex = 0; meetingFieldIndex < dataMeeting.length; meetingFieldIndex++) {
						var field = meetingFields[meetingFieldIndex]
						if ($(field).is('input[type="radio"]')) {
							field.checked = dataMeeting[meetingFieldIndex];
						} else {
							field.value = dataMeeting[meetingFieldIndex];
						}
					}
				}
			}
			for (var updatesIndex = 0; updatesIndex < data['updates'].length; updatesIndex++) {
				var blankUpdate = addUpdate();
				var update = data['updates'][updatesIndex];
				if (update['image'] && Object.keys(update['image']).length > 0) {
					$(blankUpdate).find('img').data('dataImage', update['image']).prop('src', $(blankUpdate).find('img').data('dataImage').data.link);
				}
				$(blankUpdate).find('textarea')[0].value = update['text'];
			}
			NProgress.done();
			_kmq.push(['identify', $('#studentName')[0].value]);
			_kmq.push(['record', 'Loaded']);
		}
	}).fail(function() {
		NProgress.done();
		alert("File could not be loaded. Check you have permission to the file. See the console.");
	});
}
function resetForm(forLoad) {
	_kmq.push(['clearIdentity']);
	if (!forLoad) {
		NProgress.start();
	}
	$('#studentName, #studentYear, #studentTutor, #studentSport, #studentMentor, #studentContact').each(function() {
		this.value = "";
		this.value = ""; // Fixes browser placeholder text issue
	});
	$('#studentPhotoImage').data('dataImage', {}).prop('src', "https://placehold.it/150x200?text=No%20Photo");
	$('.accordion, .updates').empty();
	if (!forLoad) {
		updateId = null;
		$('#savebutton').text("Save as new");
		NProgress.done();
	}
}

function addMeeting(sender) {
	var blankMeeting = $(sender).parent().next().clone(true,true);
	$(sender).parent().parent().prev().append(blankMeeting);
	$('.accordion input[data-type="date"]').pikaday({
		onSelect: function() {
			$('.accordion input[data-type="date"]').each(function() {
				var text = $(this)[0].value;
				if (text === "") {
					text = "Missing date";
				}
				$(this).parent().parent().prev().text(text);
			})
		}
	});
	// Does previous meeting exist?
	if (blankMeeting.prev().length != 0) {
		var fieldsNew = blankMeeting.find('input, textarea');
		var fieldsOld = blankMeeting.prev().find('input, textarea');
		for (var fieldIndex = 0; fieldIndex < fieldsNew.length; fieldIndex++) {
			$(fieldsNew[fieldIndex]).prop('placeholder', fieldsOld[fieldIndex].value);
		}
	}
	$(blankMeeting).slideDown();
	return blankMeeting;
}
function addUpdate() {
	var blankUpdate = $('#newupdatetemplate').clone(true,true).removeAttr('id');
	$('.updates').append(blankUpdate);
	$(blankUpdate).slideDown();
	return blankUpdate;
}

function onPhotoChange(element) {
	var file = element.files[0], data = new FormData();
	if (!file.type.match(/image.*/)) {
		console.warn("File was not image, canceling.");
		return;
	}
	NProgress.start();
	if (element.id === 'studentPhoto') {
		var preview = $(element).parent().prev()[0];
	} else {
		var preview = $(element).siblings('img')[0];
	}
	preview.src = "https://placehold.it/150x200?text=Loading…";
	data.append('image', file);
	$.ajax({
		url: 'https://api-imgur-com-ncl41k7thagg.runscope.net/3/image',
		type: 'POST',
		headers: {
			'Authorization': 'Client-ID 005dc1372a7697a'
		},
		data: data,
		contentType: false,
		processData: false,
		success: function(r) {
			r.data.link = r.data.link.replace('http://','https://');
			console.log(r);
			$(preview).data('dataImage', r);
			preview.src = r.data.link;
			_kmq.push(['record', 'Photo uploaded']);
			NProgress.done();
		},
		error: function(e) {
			preview.src = "https://placehold.it/150x200?text=No%20Photo"
			alert("An error occurred uploading the photo. See the console.");
			console.error(e.responseJSON);
			_kmq.push(['record', 'Error']);
			NProgress.done();
		}
	});
}

// Google Drive
var oauth, pickerLoad, pickerSave;
function driveHandleAuth(authResult) {
	console.log(authResult);
	if (authResult.error) {
		$('#authtemp, #auth, #operations').hide();$('#auth').show();
		$('#authbutton').one('click', function() {
			authGo();
		});
		NProgress.done();
	} else {
		oauth = authResult.access_token;
		gapi.client.load('drive', 'v3', function() { console.log("Drive ready"); });
		gapi.load('auth', function() {
			gapi.load('picker', function() {
				var viewLoad = new google.picker.DocsView().setIncludeFolders(true).setMode(google.picker.DocsViewMode.LIST).setQuery("jaestudent ");
				pickerLoad = new google.picker.PickerBuilder().addView(viewLoad).setOAuthToken(oauth).enableFeature(google.picker.Feature.NAV_HIDDEN).hideTitleBar().setRelayUrl('https://georgegarside.com/apps/jack-hunt/jae/assets/rpc_relay.html').setCallback(function(r) {
					if (r[google.picker.Response.ACTION] == google.picker.Action.PICKED) {
						var id = r[google.picker.Response.DOCUMENTS][0][google.picker.Document.ID];
						updateId = id;
						var url = "https://www.googleapis.com/drive/v3/files/" + id + "?alt=media";
						load(url);
					}
				}).build();
				$('#authtemp, #auth, #operations').hide();$('#operations').show();
				NProgress.done();
			});
			$('#loadbutton').on('click', function() {
				pickerLoad.setVisible(true);
			});
		})
	}
}
function authGo(immediate) {
	$('#authtemp, #auth, #operations').hide();$('#authtemp').show()
	gapi.auth.authorize({'client_id': "897045295085-6riidaqj4hnji0ek1fugv484cf98vtkf.apps.googleusercontent.com", 'scope': "https://www.googleapis.com/auth/drive.file", 'immediate': immediate}, driveHandleAuth);
}
function saveNew(data) {
	var viewSave = new google.picker.DocsView().setIncludeFolders(true).setMode(google.picker.DocsViewMode.LIST).setSelectFolderEnabled(true);
	pickerSave = new google.picker.PickerBuilder().addView(viewSave).setOAuthToken(oauth).enableFeature(google.picker.Feature.NAV_HIDDEN).setTitle("Select a folder to save the student in").setSelectableMimeTypes("application/vnd.google-apps.folder").setRelayUrl('https://georgegarside.com/apps/jack-hunt/jae/assets/rpc_relay.html').setCallback(function(r) {
		if (r[google.picker.Response.ACTION] == google.picker.Action.PICKED) {
			var id = r[google.picker.Response.DOCUMENTS][0][google.picker.Document.ID];
			uploadDocument(data, id);
		}
	}).build();
	pickerSave.setVisible(true);
}
$(document).ready(function() {
	
	NProgress.start();
	
	// load/save
	$('input[type="file"]').on('change', function() {
		if (this.files[0]) {
			onPhotoChange(this);
		}
	});
	$('#resetbutton').on('click', function() {
		resetForm(false);
	});
	$('#savebutton').on('click', save);
	
	// tabs
	$('ul.tabs li').click(function() {
		var tab_id = $(this).attr('data-tab');
		$(this).closest('.tabs-group').find('> ul.tabs li, > .tab-content').removeClass('current');
		$(this).addClass('current');
		$('[data-tab-content="' + tab_id + '"]').addClass('current');
	});
	
	// meetings
	$('input[data-type="date"]').on('input', function() {
		var newValue = $(this)[0].value;
		if (newValue == "") {
			newValue = "Blank meeting";
		}
		$(this).parent().parent().prev().text(newValue);
	});
	$('.meeting > button').click(function() {
		$(this).parent().siblings().addBack().find('> div').slideUp();
		if ($(this).next().is(":hidden")) {
			$(this).next().slideDown();
			var meetingThis = $(this).parent();
			if (meetingThis.prev().length === 0) {
				var offset = meetingThis.offset().top;
			} else {
				var meetings = meetingThis.siblings().addBack();
				var offset = meetings.first().offset().top;
				var meetingsHidden = meetings.has('> div:hidden');
				if (meetingsHidden.length !== 0) {
					offset += meetingsHidden.first().height() * meetingThis.index();
				}
			}
			$('html, body').animate({
				scrollTop: offset
			}, 500);
		}
		return false;
	});
	$('.meeting button.delete').click(function() {
		if (confirm("Are you sure you wish to delete this?") == false) {
			return;
		}
		$(this).closest('.meeting').slideUp()
		setTimeout(function() {
			$(this).closest('.meeting').remove()
		}, 1000);
	});
	$('.meeting input[type="radio"]').click(function() {
		$(this).closest('.scale').find('input[type="radio"]').not(this).prop('checked', false);
	});
	$('.new').click(function() {
		addMeeting(this);
	});
	
	// updates
	$('#newupdate').click(function() {
		addUpdate();
	});
	$('#newupdate').parent().next().find('button.delete').click(function() {
		if (confirm("Are you sure you wish to delete this?") == false) {
			return;
		}
		$(this).closest('li').slideUp()
		setTimeout(function() {
			$(this).closest('li').remove()
		}, 1000);
	});
	
	setTimeout(function() {
		google.load('picker', '1', { callback: function() {
			authGo(true);
		}});
	}, 1000);
	
	_kmq.push(['trackClick', 'new-meeting', 'New Meeting']);
	_kmq.push(['trackClick', 'new-hometina', 'New Home TINA']);
	_kmq.push(['trackClick', 'new-squadtina', 'New Squad TINA']);
	_kmq.push(['trackClick', 'new-schooltina', 'New School TINA']);
	_kmq.push(['trackClick', 'newupdate', 'New Update']);

});