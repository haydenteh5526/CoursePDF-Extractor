from app import db

class Admin(db.Model):    
    admin_id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), nullable=True)
    password = db.Column(db.CHAR(76), nullable=True)

    def __repr__(self):
        return f'<Admin {self.email}>'

class Department(db.Model):    
    department_code = db.Column(db.String(10), primary_key=True)
    department_name = db.Column(db.String(50))

    lecturers = db.relationship('Lecturer', backref='department')
    programs = db.relationship('Program', backref='department')
    persons = db.relationship('Person', backref='department')

    def __repr__(self):
        return f'<Department {self.department_code}, {self.department_name}>'

class Lecturer(db.Model):    
    lecturer_id = db.Column(db.String(10), primary_key=True)
    lecturer_name = db.Column(db.String(50))
    email_address = db.Column(db.String(100))
    level = db.Column(db.Integer)
    hourly_rate = db.Column(db.Numeric(10, 2))
    department_code = db.Column(db.String(10), db.ForeignKey('department.department_code', ondelete="SET NULL"), nullable=True)

    subjects = db.relationship('Subject', backref='lecturer')

    def __repr__(self):
        return f'<Lecturer: {self.lecturer_name}, {self.department_code}>'

class Person(db.Model):
    user_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    password = db.Column(db.CHAR(76), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    department_code = db.Column(db.String(10), db.ForeignKey('department.department_code', ondelete="SET NULL"), nullable=True)

    def __repr__(self):
        return f'<Person: {self.email}>'

class Program(db.Model):
    program_code = db.Column(db.String(10), primary_key=True)
    program_name = db.Column(db.String(50), nullable=True)
    level = db.Column(db.String(20), nullable=True)
    department_code = db.Column(db.String(10), db.ForeignKey('department.department_code', ondelete="CASCADE"), nullable=True)
    
    subjects = db.relationship('Subject', backref='program')

    def __repr__(self):
        return f'<Program {self.program_code}, {self.program_name}>'

class Subject(db.Model):
    subject_code = db.Column(db.String(10), primary_key=True)
    subject_title = db.Column(db.String(100), nullable=True)
    program_code = db.Column(db.String(10), db.ForeignKey('program.program_code', ondelete="CASCADE"), nullable=True)
    lecturer_id = db.Column(db.String(10), db.ForeignKey('lecturer.lecturer_id', ondelete="SET NULL"), nullable=True)
    lecture_hours = db.Column(db.Integer)
    tutorial_hours = db.Column(db.Integer)
    practical_hours = db.Column(db.Integer)
    blended_hours = db.Column(db.Integer)
    lecture_weeks = db.Column(db.Integer)
    tutorial_weeks = db.Column(db.Integer)
    practical_weeks = db.Column(db.Integer)
    blended_weeks = db.Column(db.Integer)

    def __repr__(self):
        return f'<Subject {self.subject_title}, {self.lecturer_id}>'
