# Introduction
«In Chrome» is a web-based interactive experience that allows a group of users to perform Terry Riley's 1964 musical composition «In C». «In Chrome» was awarded the Design and Computation Arts prize at Concordia University's 2019 Design and Computation Arts end of year show.

Terry Riley's composition consists of 53 short musical phrases, which, unlike most music, is not strictly arranged by the composer; the composer rather surrenders part of his control to the performers, who are given approximative instructions as to how to arrange these musical phrases. Performers should play the phrases in order, repeating each an arbitrary number of times while attempting to stay clustered around a restrained set of musical phrases. The expressivity and register used should be what the performer sees as best fitting.

«In Chrome» allows any person, regardless of their musical competence, to take part in the joy of making music through a simple web interface. Multiple participants can take part in playing the piece by accessing networked computers that coordinate together to play in sync.

# How to use it

This piece of software is intended for an art installation, where a few networked computers are used to play the piece collaboratively. The architecture used for synchronization between instances requires a very-low latency and jitter environement, so it should only be used on local networks. It is also necessary to note that the client-side only works with Google Chrome's web audio, (hence the name «In Chrome»).

To run this software, simply launch the server on the host computer using «launch.command», and connect to the page using client computers using the host's local ip address followed by port number 8080 (example: 192.168.0.10:8080).
