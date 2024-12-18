// Move editableFields to the global scope (outside any function)
const editableFields = {
    'departments': ['department_code', 'department_name'],
    'lecturers': ['lecturer_name', 'level', 'department_code', 'ic_no'],
    'persons': ['email', 'department_code'],
    'subjects': [
        'subject_code',
        'subject_title',
        'lecture_hours',
        'tutorial_hours',
        'practical_hours',
        'blended_hours',
        'lecture_weeks',
        'tutorial_weeks',
        'practical_weeks',
        'blended_weeks'
    ]
};

// Add these constants at the top of your file
const RECORDS_PER_PAGE = 20;
let currentPages = {
    'departments': 1,
    'lecturers': 1,
    'persons': 1,
    'subjects': 1
};

document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin JS loaded');
    
    // Initialize current tab
    const currentTab = document.querySelector('meta[name="current-tab"]').content;
    const tabButton = document.querySelector(`.tab-button[onclick*="${currentTab}"]`);
    if (tabButton) {
        tabButton.click();
    }
    
    setupTableSearch();
    
    
    const uploadForm = document.getElementById('uploadForm');
    console.log('Upload form found:', uploadForm);
    
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Form submitted');
            
            const formData = new FormData(this);
            const file = document.getElementById('courseStructure').files[0];
            
            if (!file) {
                alert('Please select a file');
                return;
            }
            
            fetch('/admin/upload_subjects', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                console.log('Response:', data);
                if (data.success) {
                    alert(data.message);
                    if (data.warnings) {
                        data.warnings.forEach(warning => {
                            alert('Warning: ' + warning);
                        });
                    }
                    window.location.reload(true);
                } else {
                    alert(data.message || 'Upload failed');
                }
            })
            .catch(error => {
                console.error('Upload error:', error);
                alert('Upload failed: ' + error.message);
            });
        });
    }

    // Add pagination handlers for each table
    ['departments', 'lecturers', 'persons', 'subjects'].forEach(tableType => {
        const container = document.getElementById(tableType);
        if (!container) return;

        const prevBtn = container.querySelector('.prev-btn');
        const nextBtn = container.querySelector('.next-btn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (currentPages[tableType] > 1) {
                    currentPages[tableType]--;
                    updateTable(tableType, currentPages[tableType]);
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const tableElement = document.getElementById(tableType + 'Table');
                const rows = Array.from(tableElement.querySelectorAll('tbody tr'));
                const filteredRows = rows.filter(row => row.dataset.searchMatch !== 'false');
                const totalPages = Math.ceil(filteredRows.length / RECORDS_PER_PAGE);

                if (currentPages[tableType] < totalPages) {
                    currentPages[tableType]++;
                    updateTable(tableType, currentPages[tableType]);
                }
            });
        }

        // Initialize table pagination
        updateTable(tableType, 1);
    });

    // Initialize tables with pagination
    ['departments', 'lecturers', 'persons', 'subjects'].forEach(table => {
        updateTable(table, 1);
    });
});

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
                window.location.reload(true);
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

    // Store current tab in session via AJAX
    fetch('/set_admin_tab', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ current_tab: tabName })
    });
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

function editRecord(table, id) {
    console.log(`Editing ${table} record with ID:`, id); // Debug log

    fetch(`/get_record/${table}/${id}`)
        .then(response => {
            console.log('Response status:', response.status); // Debug log
            return response.json();
        })
        .then(data => {
            console.log('Received data:', data); // Debug log
            
            if (data.success) {
                const modal = document.getElementById('editModal');
                const form = document.getElementById('editForm');
                
                form.dataset.table = table;
                form.dataset.id = id;
                form.dataset.mode = 'edit';

                // Create form fields first
                createFormFields(table, form);

                // Wait longer for form fields to be created and departments to be fetched
                setTimeout(() => {
                    console.log('Populating form with data:', data.record); // Debug log
                    
                    // Populate the fields
                    for (const [key, value] of Object.entries(data.record)) {
                        const input = form.querySelector(`[name="${key}"]`);
                        console.log(`Setting ${key} to ${value}, input found:`, !!input); // Debug log
                        
                        if (input) {
                            if (input.tagName === 'SELECT') {
                                // For select elements, set the selected option
                                Array.from(input.options).forEach(option => {
                                    option.selected = option.value === String(value);
                                });
                            } else {
                                input.value = value || ''; // Ensure null/undefined values are converted to empty string
                            }
                            
                            // Trigger a change event
                            input.dispatchEvent(new Event('change'));
                        }
                    }

                    // Special handling for subject levels
                    if (table === 'subjects' && data.record.levels) {
                        const levelSelect = form.querySelector('#subject_levels');
                        if (levelSelect) {
                            Array.from(levelSelect.options).forEach(option => {
                                option.selected = data.record.levels.includes(option.value);
                            });
                        }
                    }
                }, 500); // Increased timeout to 500ms

                modal.style.display = 'block';
            } else {
                console.error('Failed to get record data:', data); // Debug log
                alert('Error: ' + (data.message || 'Failed to load record data'));
            }
        })
        .catch(error => {
            console.error('Error in editRecord:', error); // Debug log
            alert('Error loading record: ' + error.message);
        });
}

function deleteRecord(table, id) {
    if (confirm(`Are you sure you want to delete this record from ${table}?`)) {
        fetch(`/api/${table}/${id}`, { method: 'DELETE' })
            .then(response => {
                if (response.ok) {
                    alert('Record deleted successfully');
                    window.location.reload();
                } else {
                    throw new Error('Failed to delete record');
                }
            })
            .catch(error => {
                console.error('Error deleting record:', error);
                alert('Error deleting record: ' + error.message);
            });
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                alert('Previewing file contents...');
                previewExcelContents(e.target.result);
            } catch (error) {
                alert('Error previewing file: ' + error.message);
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
                alert(data.message);
                window.location.reload(true);
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

// Add this function to check for existing records
async function checkExistingRecord(table, key, value) {
    try {
        const response = await fetch(`/check_record_exists/${table}/${key}/${value}`);
        const data = await response.json();
        return data.exists;
    } catch (error) {
        console.error('Error checking record:', error);
        return false;
    }
}

// Update the form submission event listener
document.getElementById('editForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const table = this.dataset.table;
    const mode = this.dataset.mode;
    const formData = {};
    const originalId = this.dataset.id;  // Store the original record ID
    
    // Collect form data
    const inputs = this.querySelectorAll('input, select');
    inputs.forEach(input => {
        if (input.name === 'subject_levels' && input.multiple) {
            formData[input.name] = Array.from(input.selectedOptions).map(option => option.value);
        } else {
            formData[input.name] = input.value;
        }
    });

    // Validate form data
    const validationErrors = validateFormData(table, formData);
    if (validationErrors.length > 0) {
        alert('Validation errors:\n' + validationErrors.join('\n'));
        return;
    }

    if (mode === 'create') {
        try {
            // Special handling for subjects
            if (table === 'subjects') {
                const response = await fetch('/save_subject', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                if (data.success) {
                    alert('Subject created successfully');
                    window.location.reload(true);
                } else {
                    alert(data.error || 'Failed to create subject');
                }
                return;
            }
    
            // Original code for other tables
            const response = await fetch(`/api/${table}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            if (data.success) {
                alert('Record created successfully');
                window.location.reload(true);
            } else {
                alert(data.error || 'Failed to create record');
            }
        } catch (error) {
            alert('Error creating record: ' + error.message);
        }
        return;
    }

    // Check for duplicate primary keys when editing
    if (mode === 'edit') {
        let exists = false;
        let primaryKeyField;
        let primaryKeyValue;
        
        switch (table) {
            case 'departments':
                primaryKeyField = 'department_code';
                primaryKeyValue = formData.department_code;
                break;
            case 'lecturers':
                primaryKeyField = 'ic_no';
                primaryKeyValue = formData.ic_no;
                break;
            case 'persons':
                primaryKeyField = 'email';
                primaryKeyValue = formData.email;
                break;
            case 'subjects':
                primaryKeyField = 'subject_code';
                primaryKeyValue = formData.subject_code;
                break;
        }

        // Only check for duplicates if the primary key has been changed
        const originalRecord = await fetch(`/get_record/${table}/${originalId}`).then(r => r.json());
        if (originalRecord.success && originalRecord.record[primaryKeyField] !== primaryKeyValue) {
            exists = await checkExistingRecord(table, primaryKeyField, primaryKeyValue);
            
            if (exists) {
                alert(`Cannot update record: A ${table.slice(0, -1)} with this ${primaryKeyField.replace(/_/g, ' ')} already exists.`);
                return;
            }
        }
    }

    // Add the id to formData for edit mode
    if (mode === 'edit') {
        formData.id = originalId;
    }

    // Special handling for subjects
    if (table === 'subjects') {
        const endpoint = mode === 'edit' ? '/update_subject' : '/save_subject';
        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                window.location.reload(true);
            } else {
                alert('Error: ' + (data.message || 'Unknown error occurred'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error: ' + error.message);
        });
    } else {
        // Original code for other tables
        const url = mode === 'create' 
            ? `/api/${table}` 
            : `/api/${table}/${originalId}`;
        
        fetch(url, {
            method: mode === 'create' ? 'POST' : 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                window.location.reload(true);
            } else {
                alert('Error: ' + (data.message || 'Unknown error occurred'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error: ' + error.message);
        });
    }
});

// Add click event listeners for create buttons
document.querySelectorAll('.create-record').forEach(button => {
    button.addEventListener('click', function() {
        const tableType = this.dataset.table;
        
        // Special handling for persons table
        if (tableType === 'persons') {
            window.location.href = '/register';  // Redirect to registration page
        } else {
            createRecord(tableType);  // Normal modal creation for other tables
        }
    });
});

function createRecord(table) {
    console.log('Creating record for table:', table);
    const modal = document.getElementById('editModal');
    const form = document.getElementById('editForm');
    
    // Set form mode for create
    form.dataset.table = table;
    form.dataset.mode = 'create';
    
    // Use the shared helper function to create fields
    createFormFields(table, form);
    
    modal.style.display = 'block';
}

// Add this function to handle pagination
function updateTable(tableType, page) {
    const tableElement = document.getElementById(tableType + 'Table');
    if (!tableElement) return;

    const rows = Array.from(tableElement.querySelectorAll('tbody tr'));
    // Only consider rows that match the search
    const filteredRows = rows.filter(row => row.dataset.searchMatch !== 'false');
    const totalPages = Math.ceil(filteredRows.length / RECORDS_PER_PAGE);
    
    // Update page numbers
    const container = tableElement.closest('.tab-content');
    const currentPageSpan = container.querySelector('.current-page');
    const totalPagesSpan = container.querySelector('.total-pages');
    
    if (currentPageSpan) currentPageSpan.textContent = page;
    if (totalPagesSpan) totalPagesSpan.textContent = totalPages;
    
    // First hide all rows
    rows.forEach(row => row.style.display = 'none');
    
    // Then show only the filtered rows for the current page
    filteredRows.slice((page - 1) * RECORDS_PER_PAGE, page * RECORDS_PER_PAGE)
        .forEach(row => row.style.display = '');
    
    // Update pagination buttons
    const prevBtn = container.querySelector('.prev-btn');
    const nextBtn = container.querySelector('.next-btn');
    if (prevBtn) prevBtn.disabled = page === 1;
    if (nextBtn) nextBtn.disabled = page === totalPages || totalPages === 0;
}

function showChangePasswordModal() {
    const modal = document.getElementById('passwordModal');
    // Reset the form fields
    document.getElementById('user_email').value = '';
    document.getElementById('new_password').value = '';
    document.getElementById('confirm_password').value = '';
    modal.style.display = 'block';
}

function closePasswordModal() {
    const modal = document.getElementById('passwordModal');
    // Reset the form fields
    document.getElementById('user_email').value = '';
    document.getElementById('new_password').value = '';
    document.getElementById('confirm_password').value = '';
    modal.style.display = 'none';
}

// Modify the password form submission handler
document.getElementById('passwordForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const password = document.getElementById('new_password').value;
    const confirmPassword = document.getElementById('confirm_password').value;
    
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    
    const data = {
        email: document.getElementById('user_email').value,
        new_password: password
    };
    
    fetch('/api/change_password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Password changed successfully');
            // Reset form and close modal
            this.reset();
            closePasswordModal();
        } else {
            alert(data.message || 'Failed to change password');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error changing password');
    });
});

function setupTableSearch() {
    document.querySelectorAll('.table-search').forEach(searchInput => {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const tableId = this.dataset.table;
            const table = document.getElementById(tableId);
            
            if (!table) {
                console.error(`Table with id ${tableId} not found`);
                return;
            }
            
            const rows = table.querySelectorAll('tbody tr');
            
            rows.forEach(row => {
                let text = Array.from(row.querySelectorAll('td'))
                    .slice(1)
                    .map(cell => cell.textContent.trim())
                    .join(' ')
                    .toLowerCase();
                
                // Set a data attribute for search matching
                row.dataset.searchMatch = text.includes(searchTerm) ? 'true' : 'false';
            });

            // Reset to first page and update the table
            const tableType = tableId.replace('Table', '');
            currentPages[tableType] = 1;
            updateTable(tableType, 1);
        });
    });
}

function setupPagination(specificTableId = null) {
    const tables = specificTableId ? [specificTableId] : ['departmentsTable', 'lecturersTable', 'personsTable', 'subjectsTable'];
    const recordsPerPage = 20;

    tables.forEach(tableId => {
        const table = document.getElementById(tableId);
        if (!table) return;

        const tbody = table.querySelector('tbody');
        // Only consider rows that aren't filtered out by search
        const rows = Array.from(tbody.querySelectorAll('tr:not(.filtered-out)'));
        const totalPages = Math.ceil(rows.length / recordsPerPage);
        
        const paginationContainer = table.parentElement.querySelector('.pagination');
        const prevBtn = paginationContainer.querySelector('.prev-btn');
        const nextBtn = paginationContainer.querySelector('.next-btn');
        const currentPageSpan = paginationContainer.querySelector('.current-page');
        const totalPagesSpan = paginationContainer.querySelector('.total-pages');

        let currentPage = 1;
        totalPagesSpan.textContent = totalPages;

        function showPage(page) {
            const start = (page - 1) * recordsPerPage;
            const end = start + recordsPerPage;

            // Hide all rows first
            tbody.querySelectorAll('tr').forEach(row => {
                row.style.display = 'none';
            });

            // Show only the rows for current page that aren't filtered out
            rows.slice(start, end).forEach(row => {
                row.style.display = '';
            });

            prevBtn.disabled = page === 1;
            nextBtn.disabled = page === totalPages;
            currentPageSpan.textContent = page;
        }

        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                showPage(currentPage);
            }
        });

        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                showPage(currentPage);
            }
        });

        // Initialize first page
        showPage(1);
    });
}
// Helper function to create a select element
function createSelect(name, options, multiple = false) {
    const select = document.createElement('select');
    select.name = name;
    select.required = true;
    select.multiple = multiple;
    
    options.forEach(opt => {
        const option = document.createElement('option');
        if (typeof opt === 'object') {
            option.value = opt.value;
            option.textContent = opt.label;
        } else {
            option.value = opt;
            option.textContent = opt;
        }
        select.appendChild(option);
    });
    
    return select;
}

// Helper function to fetch departments
async function getDepartments() {
    try {
        const response = await fetch('/get_departments');
        const data = await response.json();
        if (data.success) {
            return data.departments.map(dept => ({
                value: dept.department_code,
                label: `${dept.department_code} - ${dept.department_name}`
            }));
        }
        return [];
    } catch (error) {
        console.error('Error fetching departments:', error);
        return [];
    }
}

function createFormFields(table, form) {
    return new Promise(async (resolve) => {
        const formFields = form.querySelector('#editFormFields');
        formFields.innerHTML = '';
        const fields = editableFields[table] || [];

        // Fetch departments if needed
        const needsDepartments = (table === 'lecturers' || table === 'persons') && 
                               fields.includes('department_code');
        
        const departments = needsDepartments ? await getDepartments() : [];
        
        fields.forEach(key => {
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';
            
            const label = document.createElement('label');
            label.textContent = key.replace(/_/g, ' ')
                                 .charAt(0).toUpperCase() + 
                                 key.slice(1).replace(/_/g, ' ');
            
            let input;
            
            // Determine input type
            if (table === 'lecturers' && key === 'level') {
                input = createSelect(key, ['I', 'II', 'III']);
            } else if (key === 'department_code' && departments.length > 0) {
                input = createSelect(key, departments);
            } else if (table === 'subjects' && (key.includes('hours') || key.includes('weeks'))) {
                input = document.createElement('input');
                input.type = 'number';
                input.name = key;
                input.required = true;
            } else {
                input = document.createElement('input');
                input.type = 'text';
                input.name = key;
                input.required = true;
            }
            
            formGroup.appendChild(label);
            formGroup.appendChild(input);
            formFields.appendChild(formGroup);
        });

        // Add subject levels select for subjects table
        if (table === 'subjects') {
            const levelGroup = document.createElement('div');
            levelGroup.className = 'form-group';
            levelGroup.innerHTML = `
                <label for="subject_levels">Subject Levels:</label>
                <select id="subject_levels" name="subject_levels" multiple required>
                    <option value="Certificate">Certificate</option>
                    <option value="Foundation">Foundation</option>
                    <option value="Diploma">Diploma</option>
                    <option value="Degree">Degree</option>
                    <option value="Others">Others</option>
                </select>
                <small>Hold Ctrl/Cmd to select multiple levels</small>
            `;
            formFields.appendChild(levelGroup);
        }

        resolve();
    });
}

// Add these validation functions at the top of the file
const validationRules = {
    // Function to check for invalid special characters in text
    hasInvalidSpecialChars: (text) => {
        // Allow letters, numbers, spaces, dots, commas, hyphens, and parentheses
        const invalidCharsRegex = /[^a-zA-Z0-9\s.,\-()]/;
        return invalidCharsRegex.test(text);
    },

    // Function to validate IC number (12 digits only)
    isValidICNumber: (ic) => {
        return /^\d{12}$/.test(ic);
    },

    // Function to validate email format
    isValidEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Function to validate positive integers
    isPositiveInteger: (value) => {
        return Number.isInteger(Number(value)) && Number(value) >= 0;
    }
};

// Add this validation function
function validateFormData(table, formData) {
    const errors = [];

    switch (table) {
        case 'departments':
            // Convert department code to uppercase
            formData.department_code = formData.department_code.toUpperCase();
            
            // Check department name for special characters
            if (validationRules.hasInvalidSpecialChars(formData.department_name)) {
                errors.push("Department name contains invalid special characters");
            }
            break;

        case 'lecturers':
            // Validate lecturer name
            if (validationRules.hasInvalidSpecialChars(formData.lecturer_name)) {
                errors.push("Lecturer name contains invalid special characters");
            }
            
            // Validate IC number
            if (!validationRules.isValidICNumber(formData.ic_no)) {
                errors.push("IC number must contain exactly 12 digits");
            }
            break;

        case 'persons':
            // Validate email format
            if (!validationRules.isValidEmail(formData.email)) {
                errors.push("Invalid email format");
            }
            break;

        case 'subjects':
            // Validate subject code and title
            if (validationRules.hasInvalidSpecialChars(formData.subject_code)) {
                errors.push("Subject code contains invalid special characters");
            }
            if (validationRules.hasInvalidSpecialChars(formData.subject_title)) {
                errors.push("Subject title contains invalid special characters");
            }

            // Validate hours and weeks
            const numericFields = [
                'lecture_hours', 'tutorial_hours', 'practical_hours', 'blended_hours',
                'lecture_weeks', 'tutorial_weeks', 'practical_weeks', 'blended_weeks'
            ];

            numericFields.forEach(field => {
                if (!validationRules.isPositiveInteger(formData[field])) {
                    errors.push(`${field.replace(/_/g, ' ')} must be a positive integer`);
                }
            });
            break;
    }

    return errors;
}