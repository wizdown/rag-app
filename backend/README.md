# Backend Setup Instructions

## 1. Create a Virtual Environment

It's recommended to use a virtual environment to manage dependencies. Run the following command in your terminal:

```
python3 -m venv venv
```

## 2. Activate the Virtual Environment

```
source venv/bin/activate
```

## 3. Install Dependencies

Once the virtual environment is activated, install the required dependencies:

```
pip3 install -r requirements.txt
```

## 4. Deactivate the Virtual Environment

When you're done working, you can deactivate the virtual environment with:

```
deactivate
```

---

**Note:**
- Do not commit the `venv/` directory to version control. It is machine-specific and should be recreated by each developer.
- If you add new dependencies, run `pip3 freeze > requirements.txt` to update the list for others. 