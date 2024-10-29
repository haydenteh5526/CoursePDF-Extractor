// Main initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin JS loaded');
    
    const uploadForm = document.getElementById('uploadForm');
    console.log('Upload form found:', uploadForm);
    
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            e.preventDefault(); // Prevent traditional form submission
            console.log('Form submitted');
            
            const formData = new FormData(this);
            const courseLevel = document.getElementById('courseLevel').value;
            const file = document.getElementById('courseStructure').files[0];
            
            console.log('Course Level:', courseLevel);
            console.log('File:', file);
            
            if (!courseLevel) {
                showUploadStatus('danger', 'Please select a course level');
                return;
            }
            
            if (!file) {
                showUploadStatus('danger', 'Please select a file');
                return;
            }
            
            // Update form data with correct field names
            formData.set('course_level', courseLevel); // Match the backend expectation
            
            fetch('/admin/upload_subjects', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                console.log('Response:', data);
                if (data.success) {
                    showUploadStatus('success', data.message);
                    refreshSubjectsTable();
                    uploadForm.reset();
                } else {
                    showUploadStatus('danger', data.message || 'Upload failed');
                }
            })
            .catch(error => {
                console.error('Upload error:', error);
                showUploadStatus('danger', 'Upload failed: ' + error.message);
            });
        });
    }
});

function initializeAdminDashboard() {
    openTab(event, 'departments'); // Open the Departments tab by default
    loadAllTables();
    setupFileUpload();
}

// Handle select all checkbox
document.querySelectorAll('.select-all').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        const tableId = this.dataset.table;
        const table = document.getElementById(tableId);
        const checkboxes = table.querySelectorAll('.record-checkbox');
        checkboxes.forEach(box => {
            box.checked = this.checked;
        });
    });
});

// Handle delete selected
document.querySelectorAll('.delete-selected').forEach(button => {
    button.addEventListener('click', async function() {
        const tableType = this.dataset.table;
        const table = document.getElementById(tableType);
        const selectedBoxes = table.querySelectorAll('.record-checkbox:checked');
        
        if (selectedBoxes.length === 0) {
            alert('Please select records to delete');
            return;
        }

        if (!confirm('Are you sure you want to delete the selected records?')) {
            return;
        }

        const selectedIds = Array.from(selectedBoxes).map(box => box.dataset.id);

        try {
            const response = await fetch(`/api/delete/${tableType}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ids: selectedIds })
            });

            if (response.ok) {
                // Remove deleted rows from the table
                selectedBoxes.forEach(box => box.closest('tr').remove());
                alert('Records deleted successfully');
            } else {
                alert('Failed to delete records');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while deleting records');
        }
    });
});

// Tab Management
function openTab(evt, tabName) {
    const tabContent = document.getElementsByClassName("tab-content");
    const tabButtons = document.getElementsByClassName("tab-button");
    
    // Hide all tab content
    Array.from(tabContent).forEach(tab => {
        tab.style.display = "none";
    });
    
    // Remove active class from all buttons
    Array.from(tabButtons).forEach(button => {
        button.className = button.className.replace(" active", "");
    });
    
    // Show selected tab and activate button
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

// Table Management
function loadAllTables() {
    const tables = ['departments', 'lecturers', 'persons', 'programs', 'subjects'];
    tables.forEach(table => loadTable(table));
}

function loadTable(table) {
    const tableElement = document.getElementById(`${table}Table`);
    if (!tableElement) {
        console.error(`Table element not found: ${table}Table`);
        return;
    }
    
    showLoadingState(tableElement);
    
    // Use the new endpoint for getting data
    fetch('/admin/get-data')
        .then(response => response.json())
        .then(data => {
            if (data && data[table] && data[table].length > 0) {
                renderTable(tableElement, data[table], table);
            } else {
                showNoDataMessage(tableElement);
            }
        })
        .catch(error => {
            console.error(`Error loading ${table}:`, error);
            showErrorMessage(tableElement, error);
        });
}

function renderTable(tableElement, data, table) {
    const thead = createTableHeader(data[0]);
    const tbody = createTableBody(data, table);
    
    tableElement.innerHTML = '';
    tableElement.appendChild(thead);
    tableElement.appendChild(tbody);
}

function createTableHeader(firstRow) {
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Add data columns
    Object.keys(firstRow).forEach(key => {
        const th = document.createElement('th');
        th.textContent = key;
        headerRow.appendChild(th);
    });
    
    // Add actions column
    const actionsHeader = document.createElement('th');
    actionsHeader.textContent = 'Actions';
    headerRow.appendChild(actionsHeader);
    
    thead.appendChild(headerRow);
    return thead;
}

function createTableBody(data, table) {
    const tbody = document.createElement('tbody');
    
    data.forEach(item => {
        const row = document.createElement('tr');
        
        // Add data cells
        Object.values(item).forEach(value => {
            const td = document.createElement('td');
            td.textContent = value;
            row.appendChild(td);
        });
        
        // Add action buttons
        const actionsTd = document.createElement('td');
        actionsTd.innerHTML = `
            <button onclick="editRecord('${table}', '${item.id}')">Edit</button>
            <button onclick="deleteRecord('${table}', '${item.id}')">Delete</button>
        `;
        row.appendChild(actionsTd);
        
        tbody.appendChild(row);
    });
    
    return tbody;
}

// File Upload Management
function setupFileUpload() {
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const courseLevel = document.getElementById('course_level').value;
            
            if (!courseLevel) {
                showUploadStatus('danger', 'Please select a course level', false);
                return;
            }
            
            fetch('/admin/upload_subjects', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showUploadStatus('success', data.message, true);
                    refreshSubjectsTable();
                    uploadForm.reset();
                } else {
                    showUploadStatus('danger', data.message || 'Upload failed', false);
                }
            })
            .catch(error => {
                console.error('Upload error:', error);
                showUploadStatus('danger', 'Upload failed: ' + error.message, false);
            });
        });
    }
}

// Utility Functions
function showUploadStatus(type, message, autoHide = true) {
    const statusDiv = document.getElementById('uploadStatus');
    if (statusDiv) {
        statusDiv.className = `alert alert-${type}`;
        statusDiv.textContent = message;
        statusDiv.style.display = 'block';
        
        if (autoHide && type === 'success') {
            setTimeout(() => {
                statusDiv.style.display = 'none';
                statusDiv.textContent = '';
            }, 3000); // Hide after 3 seconds
        }
    }
}

function showLoadingState(element) {
    element.innerHTML = '<div class="alert alert-info">Loading...</div>';
}

function showNoDataMessage(element) {
    element.innerHTML = '<div class="alert alert-info">No data available</div>';
}

function showErrorMessage(element, error) {
    element.innerHTML = `<div class="alert alert-danger">Error loading data: ${error.message}</div>`;
}

// Record Management Functions
function createRecord(table) {
    console.log(`Creating new record in ${table}`);
    // Implement create functionality
}

function editRecord(table, id) {
    fetch(`/api/${table}/${id}`)
        .then(response => response.json())
        .then(data => {
            const modal = document.getElementById('editModal');
            const formFields = document.getElementById('editFormFields');
            formFields.innerHTML = '';

            // Define editable fields for each table
            const editableFields = {
                'departments': ['department_code', 'department_name'],
                'lecturers': ['lecturer_name', 'email_address', 'level', 'hourly_rate', 'department_code'],
                'persons': ['email', 'department_code'],
                'programs': ['program_code', 'program_name', 'level', 'department_code'],
                'subjects': ['subject_code', 'subject_title', 'program_code', 'lecturer_id']
            };

            // Only create form fields for the specified editable fields
            const fields = editableFields[table] || [];
            fields.forEach(key => {
                if (data.hasOwnProperty(key)) {
                    const formGroup = document.createElement('div');
                    formGroup.className = 'form-group';
                    
                    const label = document.createElement('label');
                    label.textContent = key.replace(/_/g, ' ')
                                         .charAt(0).toUpperCase() + 
                                         key.slice(1).replace(/_/g, ' ');
                    
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.name = key;
                    input.value = data[key] || '';
                    
                    formGroup.appendChild(label);
                    formGroup.appendChild(input);
                    formFields.appendChild(formGroup);
                }
            });

            // Store table and id for form submission
            const form = document.getElementById('editForm');
            form.dataset.table = table;
            form.dataset.id = id;

            modal.style.display = 'block';
        });
}

function deleteRecord(table, id) {
    if (confirm(`Are you sure you want to delete this record from ${table}?`)) {
        fetch(`/api/${table}/${id}`, { method: 'DELETE' })
            .then(response => {
                if (response.ok) {
                    loadTable(table);
                } else {
                    throw new Error('Failed to delete record');
                }
            })
            .catch(error => console.error('Error deleting record:', error));
    }
}

function refreshSubjectsTable() {
    fetch('/admin/get-data')
        .then(response => response.json())
        .then(data => {
            if (data.subjects) {
                const subjectsTab = document.querySelector('#subjects .table-responsive');
                if (subjectsTab) {
                    const table = `
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Subject Code</th>
                                    <th>Subject Title</th>
                                    <th>Course Level</th>
                                    <th>Lecture Hours</th>
                                    <th>Tutorial Hours</th>
                                    <th>Practical Hours</th>
                                    <th>Blended Hours</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.subjects.map(subject => `
                                    <tr>
                                        <td>${subject.subject_code || ''}</td>
                                        <td>${subject.subject_title || ''}</td>
                                        <td>${subject.course_level || ''}</td>
                                        <td>${subject.lecture_hours || 0}</td>
                                        <td>${subject.tutorial_hours || 0}</td>
                                        <td>${subject.practical_hours || 0}</td>
                                        <td>${subject.blended_hours || 0}</td>
                                        <td>
                                            <button class="btn btn-sm btn-primary" onclick="editSubject('${subject.subject_code}')">Edit</button>
                                            <button class="btn btn-sm btn-danger" onclick="deleteSubject('${subject.subject_code}')">Delete</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `;
                    subjectsTab.innerHTML = table;
                }
            }
        })
        .catch(error => console.error('Error refreshing subjects:', error));
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                showUploadStatus('info', 'Previewing file contents...');
                previewExcelContents(e.target.result);
            } catch (error) {
                showUploadStatus('danger', 'Error previewing file: ' + error.message);
            }
        };
        reader.readAsBinaryString(file);
    }
}

function previewExcelContents(data) {
    const previewDiv = document.getElementById('filePreview');
    if (previewDiv) {
        previewDiv.innerHTML = '<h4>File Preview</h4>';
        // Add preview table here if needed
    }
}

// Update the get subjects by level function
function getSubjectsByCourseLevel(courseLevel) {  // Changed from program level
    fetch(`/get_subjects_by_level/${courseLevel}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                refreshSubjectsTable(data.subjects);
            }
        })
        .catch(error => console.error('Error:', error));
}

// Close modal when clicking the close button or outside the modal
document.querySelector('.modal-close').addEventListener('click', () => {
    document.getElementById('editModal').style.display = 'none';
});

window.addEventListener('click', (event) => {
    const modal = document.getElementById('editModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Handle form submission
document.getElementById('editForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    const table = this.dataset.table;
    const id = this.dataset.id;

    fetch(`/api/${table}/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('editModal').style.display = 'none';
            alert(data.message || 'Changes saved successfully');
            // Refresh the entire page
            window.location.reload();
        } else {
            alert('Error updating record: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error updating record');
    });
});