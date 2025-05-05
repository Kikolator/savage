# Savage Coworking

Git Branches:
- main: latest deploy (production) **v0.1**
- dev: development area

We move dev changes to main by merging branches (don't rebase).  
```bash
git checkout main
git pull origin main        # Make sure main is up to date
git merge dev               # Merge dev into main
git push origin main        # Push updated main to remote 
``` 