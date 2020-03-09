# nowhere-art-registration
## Art grant registration form for Nowhere

You can usually find the link to where the page gets published every year on [the main art grants page](https://www.goingnowhere.org/get-involved/art/)

This is a the source for the art grant registration form (`static` folder) and 
for the backend code to receive the submission and save it (`server` folder and some glue in the root).

The backend uses a slightly unusual arrangement: a nodejs application wrapped in a CGI script that the form posts to.

Once the form gets POSTed to it, it saves the data into a google sheet (which changes every year), generates a PDF with
all the information in it and emails it to the submitter and to the art team for review 
(and saves it on the server too for good measure).

The code is relatively janky and should be rewritten as a proper nodejs server listening to POST requests, and lots
more error handling should be added as well. 

But like lots of other things at Nowhere it's *good enough* and won't be fixed until someone has the time in their 
hands to do so. 
